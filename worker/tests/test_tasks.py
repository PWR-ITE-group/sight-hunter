import io
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from uuid import UUID, uuid4

import numpy as np
from PIL import Image

from app.decision import PlaceScore, Reason, Status, Verdict
from app.judge import JudgeRequest, NoneJudge
from app.settings import Settings, Thresholds
from app.tasks import Deps, run_verification

TARGET = uuid4()
OTHER = uuid4()


def jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), "red").save(buf, "JPEG")
    return buf.getvalue()


class FakeEmbedder:
    dim = 4

    def embed(self, img: Image.Image) -> np.ndarray:
        return np.array([1, 0, 0, 0], dtype=np.float32)


@dataclass
class FakeClaim:
    scores: list[PlaceScore]
    attempt_id: UUID = field(default_factory=uuid4)
    photo_key: str = "attempts/1.jpg"
    target_place_id: UUID = TARGET
    target_name: str = "Ratusz"
    saved: Verdict | None = None

    async def place_scores(self, vec: np.ndarray, top_k: int) -> list[PlaceScore]:
        return self.scores

    async def reference_keys(self, place_id: UUID, vec: np.ndarray, n: int) -> list[str]:
        return ["refs/ratusz/a.jpg"]

    async def save(self, verdict: Verdict) -> None:
        self.saved = verdict


class FakeRepo:
    def __init__(self, claim: FakeClaim | None) -> None:
        self._claim = claim

    @asynccontextmanager
    async def claim(self, attempt_id: UUID) -> AsyncIterator[FakeClaim | None]:
        yield self._claim


class FakeStorage:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.deleted: list[str] = []

    async def fetch(self, key: str) -> bytes:
        return self.data

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        pass

    async def delete(self, key: str) -> None:
        self.deleted.append(key)


class FakeReward:
    def __init__(self) -> None:
        self.calls: list[UUID] = []

    async def on_accepted(self, attempt_id: UUID) -> None:
        self.calls.append(attempt_id)


class YesJudge:
    name = "fake"
    enabled = True

    def __init__(self) -> None:
        self.requests: list[JudgeRequest] = []

    async def compare(self, req: JudgeRequest) -> bool | None:
        self.requests.append(req)
        return True


def make(claim: FakeClaim | None, photo: bytes | None = None,
         judge: object | None = None) -> tuple[Deps, FakeStorage, FakeReward]:
    storage, reward = FakeStorage(photo or jpeg()), FakeReward()
    settings = Settings(thresholds=Thresholds(t_low=0.45, t_high=0.7, margin=0.05, t_single=0.6))
    deps = Deps(settings, FakeRepo(claim), storage, FakeEmbedder(),
                judge or NoneJudge(), reward)  # type: ignore[arg-type]
    return deps, storage, reward


async def test_accepted_saves_rewards_and_deletes_photo() -> None:
    claim = FakeClaim([PlaceScore(TARGET, "Ratusz", 0.9), PlaceScore(OTHER, "X", 0.3)])
    deps, storage, reward = make(claim)
    v = await run_verification(deps, claim.attempt_id)
    assert v is not None and v.status is Status.ACCEPTED
    assert claim.saved == v
    assert reward.calls == [claim.attempt_id]
    assert storage.deleted == ["attempts/1.jpg"]


async def test_wrong_place_no_reward() -> None:
    claim = FakeClaim([PlaceScore(OTHER, "Kościół", 0.9), PlaceScore(TARGET, "Ratusz", 0.4)])
    deps, _, reward = make(claim)
    v = await run_verification(deps, claim.attempt_id)
    assert v is not None and v.reason is Reason.WRONG_PLACE
    assert v.wrong_place_name == "Kościół"
    assert reward.calls == []


async def test_not_queued_is_skipped() -> None:
    deps, storage, _ = make(None)
    assert await run_verification(deps, uuid4()) is None
    assert storage.deleted == []


async def test_broken_image_rejected() -> None:
    claim = FakeClaim([PlaceScore(TARGET, "Ratusz", 0.9)])
    deps, _, _ = make(claim, photo=b"not an image")
    v = await run_verification(deps, claim.attempt_id)
    assert v is not None and v.status is Status.REJECTED and v.reason is Reason.NOT_MATCHED


async def test_gray_zone_asks_enabled_judge() -> None:
    claim = FakeClaim([PlaceScore(TARGET, "Ratusz", 0.5)])
    judge = YesJudge()
    deps, _, _ = make(claim, judge=judge)
    v = await run_verification(deps, claim.attempt_id)
    assert v is not None and v.status is Status.ACCEPTED and v.judge == "fake"
    assert len(judge.requests) == 1 and judge.requests[0].place_name == "Ratusz"
