"""End-to-end: HTTP API -> arq:queue:ml -> ML worker -> arq:queue:api -> verdict worker -> API.

The ML worker is the real `worker/` code started from its own virtualenv as a subprocess
(`arq app.main.WorkerSettings --burst`) against the test Postgres and Redis. It runs with
`MODEL_NAME=tiny` (pixel thumbnails, no weights) and reads photos from a temporary folder,
so what is under test is the contract: queue names, job arguments, the attempt/place/ref
schema, the verdict hand-off and what the API does with it. Recognition quality is not.

Skipped when worker/.venv is missing: `cd worker && poetry install`.
"""

import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Any

import pytest
from arq.worker import Worker
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.redis import API_QUEUE, ML_QUEUE, arq_settings
from app.modules.quests.models import PlaceRef
from app.seed import seed, sid
from app.worker import apply_verdict
from tests.conftest import FakeStorage
from tests.test_auth import bearer, register
from tests.test_finds import KATEDRA, RATUSZ, create_attempt, position, start_round, submit

REPO = Path(__file__).resolve().parents[2]
WORKER_DIR = REPO / "worker"
WORKER_PYTHON = WORKER_DIR / ".venv" / "bin" / "python"
WORKER_ARQ = WORKER_DIR / ".venv" / "bin" / "arq"
WORKER_TIMEOUT_S = 120

pytestmark = pytest.mark.skipif(
    not WORKER_ARQ.exists(), reason="worker/.venv not installed (cd worker && poetry install)"
)

# Runs in the worker's venv: three JPEGs (two "places", one noise) and the tiny embeddings
# of the two reference photos, computed by the very code the worker will use on the uploads.
MAKE_PHOTOS = """
import json, sys
import numpy as np
from PIL import Image
from app.embedder import build_embedder, load_image

root = sys.argv[1]

def gradient(color):
    arr = np.zeros((64, 64, 3), dtype=np.uint8)
    for i in range(64):
        arr[i, :, :] = [int(c * i / 63) for c in color]
    return Image.fromarray(arr)

noise = np.random.default_rng(7).integers(0, 255, (64, 64, 3), dtype=np.uint8)
images = {
    "ratusz": gradient((255, 40, 40)),
    "katedra": gradient((40, 40, 255)),
    "noise": Image.fromarray(noise),
}
for name, img in images.items():
    img.save(f"{root}/{name}.jpg", "JPEG", quality=95)
e = build_embedder("tiny")
refs = {}
for name in ("ratusz", "katedra"):
    with open(f"{root}/{name}.jpg", "rb") as f:
        refs[name] = e.embed(load_image(f.read())).tolist()
print(json.dumps(refs))
"""


async def run_in_worker_venv(*args: str, env: dict[str, str] | None = None) -> tuple[str, str]:
    """(stdout, stderr) of a command run from worker/ in the worker's virtualenv."""
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=WORKER_DIR,
        env=env or os.environ,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, err = await asyncio.wait_for(proc.communicate(), WORKER_TIMEOUT_S)
    assert proc.returncode == 0, f"{args[0]} failed:\n{out.decode()}\n{err.decode()}"
    return out.decode(), err.decode()


@pytest.fixture(scope="module")
def photos(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Any]:
    root = tmp_path_factory.mktemp("photos")
    out, _ = asyncio.run(run_in_worker_venv(str(WORKER_PYTHON), "-c", MAKE_PHOTOS, str(root)))
    return {"dir": root, "refs": json.loads(out)}


@pytest.fixture
def storage_root(tmp_path: Path) -> Path:
    """The bucket as the ML worker sees it (STORAGE_BACKEND=local)."""
    return tmp_path / "bucket"


@pytest.fixture
async def refs(session: AsyncSession, photos: dict[str, Any]) -> None:
    await seed(session)
    for key, vec in photos["refs"].items():
        session.add(
            PlaceRef(
                place_id=sid(f"place:{key}"),
                photo_url=f"refs/{key}/{key}.jpg",
                sha256=f"e2e-{key}",
                model="tiny",
                embedding=vec,
            )
        )
    await session.commit()


@pytest.fixture
async def auth(client: AsyncClient) -> dict[str, str]:
    return bearer(await register(client))


# The verdicts asserted below assume exactly these thresholds (tiny embedder: same bytes = 1.0,
# another colour < 0.35) and no external judge.
THRESHOLDS = {
    "VERIFY_T_LOW": "0.35",
    "VERIFY_T_HIGH": "0.61",
    "VERIFY_MARGIN": "0.09",
    "VERIFY_T_SINGLE": "0.61",
    "JUDGE_PROVIDER": "none",
}


def ml_worker_env(storage_root: Path) -> dict[str, str]:
    """A minimal, fully pinned environment: nothing is inherited from the shell, and every
    setting the verdict depends on is set here, so a developer's `worker/.env` (thresholds,
    a real judge, S3) cannot change the outcome."""
    s = get_settings()
    return {
        **{k: os.environ[k] for k in ("PATH", "HOME", "TMPDIR", "LANG") if k in os.environ},
        "PYTHONUNBUFFERED": "1",
        "DATABASE_URL": s.db_url,
        "REDIS_URL": s.redis_dsn,
        "ARQ_QUEUE": ML_QUEUE,
        "API_QUEUE": API_QUEUE,
        "MODEL_NAME": "tiny",
        "STORAGE_BACKEND": "local",
        "STORAGE_LOCAL_ROOT": str(storage_root),
        "DELETE_PHOTO_AFTER_VERDICT": "false",
        **THRESHOLDS,
    }


async def run_ml_worker(storage_root: Path) -> str:
    """The real worker, burst mode: handles every queued verify_attempt job, then exits."""
    out, err = await run_in_worker_venv(
        str(WORKER_ARQ), "app.main.WorkerSettings", "--burst", env=ml_worker_env(storage_root)
    )
    return out + err  # the worker logs to stderr


async def run_verdict_worker(monkeypatch: pytest.MonkeyPatch, storage: FakeStorage) -> None:
    """Our own arq worker (app.worker) in burst mode, in-process, on the test's fake bucket."""
    monkeypatch.setattr("app.worker.get_storage", lambda: storage)
    worker = Worker(
        functions=[apply_verdict],
        queue_name=API_QUEUE,
        redis_settings=arq_settings(),
        burst=True,
        handle_signals=False,
        poll_delay=0.1,
    )
    try:
        await worker.main()
    finally:
        await worker.close()


async def play(
    monkeypatch: pytest.MonkeyPatch,
    client: AsyncClient,
    auth: dict[str, str],
    redis: Redis,
    storage: FakeStorage,
    storage_root: Path,
    photos: dict[str, Any],
    place: dict[str, Any],
    photo: str,
) -> dict[str, Any]:
    """One round for `place`, uploading `photo`, through both workers; returns the poll."""
    round_id = await start_round(client, auth, place["key"])
    created = await create_attempt(client, auth, round_id, position(place))
    attempt_id = created["attempt_id"]
    key = f"attempts/{attempt_id}.jpg"

    # What the phone's presigned PUT does: the bytes land in the bucket.
    target = storage_root / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes((photos["dir"] / f"{photo}.jpg").read_bytes())
    storage.upload(key)

    assert (await submit(client, auth, attempt_id)).status_code == 202
    assert await redis.zcard(ML_QUEUE) == 1

    log = await run_ml_worker(storage_root)
    assert await redis.zcard(ML_QUEUE) == 0, log
    assert await redis.zcard(API_QUEUE) == 1, log
    await run_verdict_worker(monkeypatch, storage)
    assert await redis.zcard(API_QUEUE) == 0

    poll: dict[str, Any] = (await client.get(f"/api/v1/attempts/{attempt_id}", headers=auth)).json()
    poll["_attempt_id"] = attempt_id
    poll["_log"] = log
    return poll


async def test_photo_of_the_place_is_accepted_and_rewarded(
    monkeypatch: pytest.MonkeyPatch,
    client: AsyncClient,
    auth: dict[str, str],
    redis: Redis,
    storage: FakeStorage,
    storage_root: Path,
    photos: dict[str, Any],
    refs: None,
) -> None:
    poll = await play(
        monkeypatch, client, auth, redis, storage, storage_root, photos, RATUSZ, "ratusz"
    )
    assert poll["status"] == "accepted", poll["_log"]
    assert poll["points_awarded"] == 40 and poll["xp_awarded"] == 100
    assert poll["reel_id"] == str(sid("reel:ratusz"))

    me = (await client.get("/api/v1/me", headers=auth)).json()
    assert me["points"] == 50 + 40 and me["xp"] == 100
    # The API, not the worker, deleted the player photo (NFT-06).
    assert storage.deleted == [f"attempts/{poll['_attempt_id']}.jpg"]


async def test_photo_of_another_place_is_wrong_place(
    monkeypatch: pytest.MonkeyPatch,
    client: AsyncClient,
    auth: dict[str, str],
    redis: Redis,
    storage: FakeStorage,
    storage_root: Path,
    photos: dict[str, Any],
    refs: None,
) -> None:
    poll = await play(
        monkeypatch, client, auth, redis, storage, storage_root, photos, RATUSZ, "katedra"
    )
    assert poll["status"] == "rejected", poll["_log"]
    assert poll["reason"] == "wrong_place"
    assert poll["wrong_place_name"] == KATEDRA["name"]
    assert poll["attempts_left"] == get_settings().max_attempts_per_round - 1
    assert (await client.get("/api/v1/me", headers=auth)).json()["points"] == 50


async def test_unrelated_photo_is_not_matched(
    monkeypatch: pytest.MonkeyPatch,
    client: AsyncClient,
    auth: dict[str, str],
    redis: Redis,
    storage: FakeStorage,
    storage_root: Path,
    photos: dict[str, Any],
    refs: None,
) -> None:
    poll = await play(
        monkeypatch, client, auth, redis, storage, storage_root, photos, RATUSZ, "noise"
    )
    assert poll["status"] == "rejected", poll["_log"]
    assert poll["reason"] == "not_matched" and poll["wrong_place_name"] is None


async def test_verdict_for_an_unknown_attempt_is_skipped_not_crashed(
    redis: Redis, storage_root: Path, refs: None
) -> None:
    """A stale job (attempt gone) must not block the queue."""
    from arq import create_pool

    pool = await create_pool(arq_settings())
    try:
        await pool.enqueue_job(
            "verify_attempt",
            str(uuid.uuid4()),
            "attempts/x.jpg",
            str(sid("place:ratusz")),
            _queue_name=ML_QUEUE,
        )
    finally:
        await pool.aclose()
    log = await run_ml_worker(storage_root)
    assert "skipping" in log, log
    assert await redis.zcard(API_QUEUE) == 0
