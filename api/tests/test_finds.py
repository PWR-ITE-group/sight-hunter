import uuid
from datetime import UTC, datetime
from typing import Any

import pytest
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.redis import API_QUEUE, ML_QUEUE
from app.modules.finds.models import Attempt
from app.modules.quests.models import TaskRound
from app.modules.wallet.models import WalletLedger
from app.seed import PLACES, seed, sid
from app.worker import apply_verdict as worker_apply_verdict
from tests.conftest import FakeStorage
from tests.test_auth import bearer, register

RATUSZ = PLACES[0]
KATEDRA = PLACES[1]


@pytest.fixture(autouse=True)
async def _seeded(session: AsyncSession) -> None:
    await seed(session)


@pytest.fixture
async def auth(client: AsyncClient) -> dict[str, str]:
    return bearer(await register(client))


@pytest.fixture
def demo_mode() -> Any:
    s = get_settings()
    s.demo_mode, saved = True, s.demo_mode
    yield
    s.demo_mode = saved


@pytest.fixture
def verify_stub() -> Any:
    s = get_settings()
    s.verify_stub, saved = True, s.verify_stub
    yield
    s.verify_stub = saved


def position(place: dict[str, Any], d_lat: float = 0.0, **extra: Any) -> dict[str, Any]:
    return {
        "lat": place["lat"] + d_lat,
        "lng": place["lng"],
        "accuracy_m": 8,
        "taken_at": datetime.now(UTC).isoformat(),
        "mocked": False,
        **extra,
    }


async def start_round(client: AsyncClient, auth: dict[str, str], key: str = "ratusz") -> str:
    r = await client.post(f"/api/v1/tasks/{sid(f'task:{key}')}/rounds", headers=auth)
    assert r.status_code in (200, 201), r.text
    return str(r.json()["id"])


async def create_attempt(
    client: AsyncClient, auth: dict[str, str], round_id: str, body: dict[str, Any]
) -> dict[str, Any]:
    r = await client.post(f"/api/v1/rounds/{round_id}/attempts", json=body, headers=auth)
    assert r.status_code == 201, r.text
    data: dict[str, Any] = r.json()
    return data


async def submit(
    client: AsyncClient, auth: dict[str, str], attempt_id: str, key: str | None = None
) -> Any:
    return await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers={**auth, "Idempotency-Key": key or str(uuid.uuid4())},
    )


async def verdict(
    session: AsyncSession,
    redis: Redis,
    storage: FakeStorage,
    attempt_id: str,
    verdict: str = "accepted",
    matched: str | None = None,
) -> None:
    """What the ML worker's job does, via our worker's entrypoint."""
    from app.modules.finds import service as finds

    await finds.apply_verdict(
        session,
        redis,
        storage,
        uuid.UUID(attempt_id),
        verdict,  # type: ignore[arg-type]
        0.9,
        uuid.UUID(matched) if matched else None,
    )


async def test_full_round_accepted(
    client: AsyncClient,
    auth: dict[str, str],
    session: AsyncSession,
    redis: Redis,
    storage: FakeStorage,
) -> None:
    round_id = await start_round(client, auth)
    created = await create_attempt(client, auth, round_id, position(RATUSZ))
    attempt_id = created["attempt_id"]
    assert created["upload_url"].startswith("http://storage.test/attempts/")

    # Submitting before the upload landed.
    r = await submit(client, auth, attempt_id)
    assert r.status_code == 409
    assert r.json()["code"] == "upload_missing"

    storage.upload(f"attempts/{attempt_id}.jpg")
    key = str(uuid.uuid4())
    r = await submit(client, auth, attempt_id, key)
    assert r.status_code == 202
    assert r.json()["status"] == "queued"
    assert (await submit(client, auth, attempt_id, key)).json() == r.json()
    assert await redis.zcard(ML_QUEUE) == 1

    poll = await client.get(f"/api/v1/attempts/{attempt_id}", headers=auth)
    assert poll.json()["status"] == "queued"

    await verdict(session, redis, storage, attempt_id, "accepted", str(sid("place:ratusz")))

    poll = (await client.get(f"/api/v1/attempts/{attempt_id}", headers=auth)).json()
    assert poll["status"] == "accepted"
    assert poll["points_awarded"] == 40
    assert poll["xp_awarded"] == 100
    assert poll["reel_id"] == str(sid("reel:ratusz"))

    me = (await client.get("/api/v1/me", headers=auth)).json()
    assert me["points"] == 50 + 40
    assert me["xp"] == 100
    assert await redis.zscore("lb:all", me["id"]) == 100

    # NFT-06: photo gone, coordinates gone; round closed; place now shows as found.
    assert storage.deleted == [f"attempts/{attempt_id}.jpg"]
    row = await session.get(Attempt, uuid.UUID(attempt_id))
    assert row is not None and row.photo_key is None and row.gps is None
    rnd = await session.get(TaskRound, uuid.UUID(round_id))
    assert rnd is not None and rnd.status == "completed"
    nearby = (
        await client.get(
            "/api/v1/places/nearby",
            params={"lat": RATUSZ["lat"], "lng": RATUSZ["lng"], "radius": 100},
            headers=auth,
        )
    ).json()["items"]
    assert nearby[0]["found"] is True and nearby[0]["name"] == RATUSZ["name"]
    r = await client.post(f"/api/v1/tasks/{sid('task:ratusz')}/rounds", headers=auth)
    assert r.status_code == 409


async def test_verdict_applied_twice_pays_once(
    client: AsyncClient,
    auth: dict[str, str],
    session: AsyncSession,
    redis: Redis,
    storage: FakeStorage,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.worker.get_storage", lambda: storage)
    round_id = await start_round(client, auth)
    attempt_id = (await create_attempt(client, auth, round_id, position(RATUSZ)))["attempt_id"]
    storage.upload(f"attempts/{attempt_id}.jpg")
    await submit(client, auth, attempt_id)
    # Through the arq entrypoint, as the real worker would.
    await worker_apply_verdict({}, attempt_id, "accepted", 0.95, str(sid("place:ratusz")))
    await worker_apply_verdict({}, attempt_id, "accepted", 0.95, str(sid("place:ratusz")))
    n = await session.scalar(select(func.count()).select_from(WalletLedger))
    assert n == 2  # welcome + one find
    me = (await client.get("/api/v1/me", headers=auth)).json()
    assert me["points"] == 90 and me["xp"] == 100
    assert storage.deleted == [f"attempts/{attempt_id}.jpg"]


async def test_too_far_and_mock_location(
    client: AsyncClient, auth: dict[str, str], demo_mode: None
) -> None:
    round_id = await start_round(client, auth)
    r = await client.post(
        f"/api/v1/rounds/{round_id}/attempts",
        json=position(RATUSZ, d_lat=0.0045),  # ~500 m north
        headers=auth,
    )
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "too_far"
    assert 450 <= body["details"]["distance_m"] <= 550
    assert "500" in body["message"] or str(body["details"]["distance_m"]) in body["message"]

    # Demo mode accepts a manually set (mocked) position …
    r = await client.post(
        f"/api/v1/rounds/{round_id}/attempts", json=position(RATUSZ, mocked=True), headers=auth
    )
    assert r.status_code == 201
    # … but not in production mode.
    get_settings().demo_mode = False
    r = await client.post(
        f"/api/v1/rounds/{round_id}/attempts", json=position(RATUSZ, mocked=True), headers=auth
    )
    assert r.status_code == 422
    assert r.json()["code"] == "mock_location"


async def test_rejected_wrong_place_and_attempt_limit(
    client: AsyncClient,
    auth: dict[str, str],
    session: AsyncSession,
    redis: Redis,
    storage: FakeStorage,
) -> None:
    round_id = await start_round(client, auth)
    for i in range(5):
        attempt_id = (await create_attempt(client, auth, round_id, position(RATUSZ)))["attempt_id"]
        storage.upload(f"attempts/{attempt_id}.jpg")
        assert (await submit(client, auth, attempt_id)).status_code == 202
        matched = str(sid("place:katedra")) if i == 0 else None
        await verdict(session, redis, storage, attempt_id, "rejected", matched)
        poll = (await client.get(f"/api/v1/attempts/{attempt_id}", headers=auth)).json()
        assert poll["status"] == "rejected"
        assert poll["attempts_left"] == 4 - i
        if i == 0:
            assert poll["reason"] == "wrong_place"
            assert poll["wrong_place_name"] == KATEDRA["name"]
        else:
            assert poll["reason"] == "not_matched"
            assert poll["wrong_place_name"] is None

    rnd = await session.get(TaskRound, uuid.UUID(round_id))
    assert rnd is not None and rnd.status == "abandoned"
    r = await client.post(
        f"/api/v1/rounds/{round_id}/attempts", json=position(RATUSZ), headers=auth
    )
    assert r.status_code == 409
    assert r.json()["code"] == "round_not_active"
    me = (await client.get("/api/v1/me", headers=auth)).json()
    assert me["points"] == 50 and me["xp"] == 0


async def test_hints_reduce_points_not_xp_in_reward(
    client: AsyncClient,
    auth: dict[str, str],
    session: AsyncSession,
    redis: Redis,
    storage: FakeStorage,
) -> None:
    round_id = await start_round(client, auth)
    await client.post(
        f"/api/v1/rounds/{round_id}/hints", headers={**auth, "Idempotency-Key": str(uuid.uuid4())}
    )
    attempt_id = (await create_attempt(client, auth, round_id, position(RATUSZ)))["attempt_id"]
    storage.upload(f"attempts/{attempt_id}.jpg")
    await submit(client, auth, attempt_id)
    await verdict(session, redis, storage, attempt_id)
    poll = (await client.get(f"/api/v1/attempts/{attempt_id}", headers=auth)).json()
    assert poll["points_awarded"] == 30
    assert poll["xp_awarded"] == 100


async def test_referral_bonus_on_first_find_only(
    client: AsyncClient, session: AsyncSession, redis: Redis, storage: FakeStorage
) -> None:
    inviter = await register(client)
    invited = bearer(await register(client, ref_code=inviter["user"]["ref_code"]))
    for key in ("ratusz", "katedra"):
        round_id = await start_round(client, invited, key)
        place = RATUSZ if key == "ratusz" else KATEDRA
        attempt_id = (await create_attempt(client, invited, round_id, position(place)))[
            "attempt_id"
        ]
        storage.upload(f"attempts/{attempt_id}.jpg")
        await submit(client, invited, attempt_id)
        await verdict(session, redis, storage, attempt_id)
    me = (await client.get("/api/v1/me", headers=bearer(inviter))).json()
    assert me["points"] == 50 + 20


async def test_verify_stub_queues_verdict_for_our_worker(
    client: AsyncClient, auth: dict[str, str], redis: Redis, storage: FakeStorage, verify_stub: None
) -> None:
    round_id = await start_round(client, auth)
    attempt_id = (await create_attempt(client, auth, round_id, position(RATUSZ)))["attempt_id"]
    storage.upload(f"attempts/{attempt_id}.jpg")
    assert (await submit(client, auth, attempt_id)).status_code == 202
    assert await redis.zcard(API_QUEUE) == 1
    assert await redis.zcard(ML_QUEUE) == 0


async def test_attempt_of_other_user_is_hidden(client: AsyncClient, auth: dict[str, str]) -> None:
    round_id = await start_round(client, auth)
    attempt_id = (await create_attempt(client, auth, round_id, position(RATUSZ)))["attempt_id"]
    other = bearer(await register(client))
    r = await client.get(f"/api/v1/attempts/{attempt_id}", headers=other)
    assert r.status_code == 404
    r = await submit(client, other, attempt_id)
    assert r.status_code == 404
