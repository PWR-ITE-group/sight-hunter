import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from arq import ArqRedis
from fastapi import status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, not_found
from app.core.geo import geo_point
from app.core.idempotency import run_idempotent
from app.core.redis import API_QUEUE, ML_QUEUE
from app.core.storage import Storage
from app.modules.auth import repository as users
from app.modules.auth.models import User
from app.modules.finds import repository as repo
from app.modules.finds.models import Attempt, AttemptStatus, Find
from app.modules.finds.schemas import AttemptCreated, AttemptOut, AttemptRequest
from app.modules.media import service as media
from app.modules.quests import repository as quests
from app.modules.quests import service as quests_service
from app.modules.quests.models import RoundStatus
from app.modules.wallet import service as wallet
from app.modules.wallet.models import LedgerReason

Verdict = Literal["accepted", "rejected"]


async def create_attempt(
    session: AsyncSession,
    storage: Storage,
    user: User,
    round_id: uuid.UUID,
    body: AttemptRequest,
) -> AttemptCreated:
    """Fast checks before any upload: active round, attempt limit, mock GPS, geofence."""
    settings = get_settings()
    rnd = await quests.get_round_for_update(session, round_id)
    if rnd is None or rnd.user_id != user.id:
        raise not_found("round")
    if rnd.status != RoundStatus.ACTIVE:
        raise AppError("round_not_active", status.HTTP_409_CONFLICT)
    if await quests_service.attempts_left(session, rnd.id) <= 0:
        raise AppError("attempts_limit", status.HTTP_429_TOO_MANY_REQUESTS)
    # Demo mode: the client sets its position by hand, so a mocked flag is expected there.
    if body.mocked and not settings.demo_mode:
        raise AppError("mock_location", status.HTTP_422_UNPROCESSABLE_CONTENT)

    task = await quests.get_task(session, rnd.task_id)
    assert task is not None
    place = await quests.get_place(session, task.place_id)
    assert place is not None
    distance = await quests.distance_to_place_m(session, place.id, body.lat, body.lng)
    # GPS accuracy is forgiven up to a cap, so standing on the edge of the zone isn't "too far".
    slack = min(max(body.accuracy_m, 0), settings.gps_slack_max_m)
    if distance > place.radius_m + slack:
        raise AppError(
            "too_far", status.HTTP_422_UNPROCESSABLE_CONTENT, {"distance_m": round(distance)}
        )

    attempt_id = uuid.uuid4()
    photo_key = f"attempts/{attempt_id}.jpg"
    repo.add_attempt(
        session,
        Attempt(
            id=attempt_id,
            round_id=rnd.id,
            user_id=user.id,
            photo_key=photo_key,
            gps=geo_point(body.lng, body.lat),
            accuracy_m=body.accuracy_m,
            taken_at=body.taken_at,
        ),
    )
    upload_url, expires_at = await storage.presign_put(photo_key, "image/jpeg")
    await session.commit()
    return AttemptCreated(
        attempt_id=attempt_id, upload_url=upload_url, upload_expires_at=expires_at
    )


async def attempt_out(session: AsyncSession, attempt: Attempt) -> AttemptOut:
    out = AttemptOut(id=attempt.id, status=attempt.status)
    if attempt.status == AttemptStatus.REJECTED:
        out.reason = "wrong_place" if attempt.reason == "wrong_place" else "not_matched"
        if attempt.matched_place_id is not None:
            other = await quests.get_place(session, attempt.matched_place_id)
            out.wrong_place_name = other.name if other else None
        out.attempts_left = await quests_service.attempts_left(session, attempt.round_id)
    elif attempt.status == AttemptStatus.ACCEPTED:
        find = await repo.get_find_by_attempt(session, attempt.id)
        if find is not None:
            out.points_awarded = find.points_awarded
            out.xp_awarded = find.xp_awarded
            out.reel_id = await media.unlocked_reel_for_task(session, attempt.user_id, find.task_id)
    return out


async def get_attempt(session: AsyncSession, user: User, attempt_id: uuid.UUID) -> AttemptOut:
    attempt = await repo.get_attempt(session, attempt_id)
    if attempt is None or attempt.user_id != user.id:
        raise not_found("attempt")
    return await attempt_out(session, attempt)


async def submit_attempt(
    session: AsyncSession,
    storage: Storage,
    arq: ArqRedis,
    user: User,
    attempt_id: uuid.UUID,
    key: uuid.UUID,
) -> tuple[int, dict[str, Any]]:
    """Queues verification once the photo is in the bucket. A retry re-returns 202."""

    async def op() -> tuple[int, dict[str, Any]]:
        attempt = await repo.get_attempt_for_update(session, attempt_id)
        if attempt is None or attempt.user_id != user.id:
            raise not_found("attempt")
        if attempt.status != AttemptStatus.AWAITING_UPLOAD:
            # Already submitted (retry with a new key after a dropped connection).
            out = await attempt_out(session, attempt)
            return status.HTTP_202_ACCEPTED, out.model_dump(mode="json")
        assert attempt.photo_key is not None
        if not await storage.exists(attempt.photo_key):
            raise AppError("upload_missing", status.HTTP_409_CONFLICT)
        rnd = await quests.get_round(session, attempt.round_id)
        assert rnd is not None
        if rnd.status != RoundStatus.ACTIVE:
            raise AppError("round_not_active", status.HTTP_409_CONFLICT)
        task = await quests.get_task(session, rnd.task_id)
        assert task is not None
        attempt.status = AttemptStatus.QUEUED
        await session.flush()
        if get_settings().verify_stub:
            # No ML worker around: our own worker gets an "accepted" verdict right away.
            await arq.enqueue_job(
                "apply_verdict",
                str(attempt.id),
                "accepted",
                1.0,
                str(task.place_id),
                _queue_name=API_QUEUE,
                _job_id=f"verdict:{attempt.id}",
            )
        else:
            await arq.enqueue_job(
                "verify_attempt",
                str(attempt.id),
                attempt.photo_key,
                str(task.place_id),
                _queue_name=ML_QUEUE,
                _job_id=f"verify:{attempt.id}",
            )
        out = await attempt_out(session, attempt)
        return status.HTTP_202_ACCEPTED, out.model_dump(mode="json")

    return await run_idempotent(session, user.id, key, "submit", op)


def leaderboard_keys(now: datetime) -> list[str]:
    year, week, _ = now.isocalendar()
    return ["lb:all", f"lb:week:{year}-{week:02d}"]


async def apply_verdict(
    session: AsyncSession,
    redis: Redis,
    storage: Storage,
    attempt_id: uuid.UUID,
    verdict: Verdict,
    score: float | None,
    matched_place_id: uuid.UUID | None,
) -> None:
    """Writes the verdict and, when accepted, pays the reward in one transaction.

    Safe to run twice: a verdict only applies to a QUEUED attempt, and `finds` is unique per
    (user, task). Leaderboard update and photo deletion happen after the commit.
    """
    attempt = await repo.get_attempt_for_update(session, attempt_id)
    if attempt is None or attempt.status != AttemptStatus.QUEUED:
        return
    rnd = await quests.get_round_for_update(session, attempt.round_id)
    assert rnd is not None
    task = await quests.get_task(session, rnd.task_id)
    assert task is not None
    now = datetime.now(UTC)
    attempt.score = score
    attempt.verdict_at = now
    photo_key = attempt.photo_key
    xp_awarded = 0

    if verdict == "accepted":
        attempt.status = AttemptStatus.ACCEPTED
        attempt.matched_place_id = task.place_id
        rnd.status = RoundStatus.COMPLETED
        rnd.finished_at = now
        if not await quests.has_find(session, rnd.user_id, task.id):
            find = repo.add_find(
                session,
                Find(
                    user_id=rnd.user_id,
                    task_id=task.id,
                    attempt_id=attempt.id,
                    points_awarded=rnd.reward_points,
                    xp_awarded=rnd.reward_xp,
                ),
            )
            await session.flush()
            wallet.add_points(session, rnd.user_id, rnd.reward_points, LedgerReason.FIND, find.id)
            wallet.add_xp(session, rnd.user_id, rnd.reward_xp, LedgerReason.FIND, find.id)
            xp_awarded = rnd.reward_xp
            await media.unlock_reward_reel(session, rnd.user_id, task.place_id)
            await _referral_bonus(session, rnd.user_id, find.id)
    else:
        attempt.status = AttemptStatus.REJECTED
        if matched_place_id is not None and matched_place_id != task.place_id:
            attempt.reason = "wrong_place"
            attempt.matched_place_id = matched_place_id
        else:
            attempt.reason = "not_matched"
        if await quests_service.attempts_left(session, rnd.id) <= 0:
            rnd.status = RoundStatus.ABANDONED
            rnd.finished_at = now
    user_id = rnd.user_id
    await session.commit()

    if xp_awarded:
        for key in leaderboard_keys(now):
            await redis.zincrby(key, xp_awarded, str(user_id))
    await _cleanup(session, storage, attempt_id, photo_key)


async def _referral_bonus(session: AsyncSession, user_id: uuid.UUID, find_id: uuid.UUID) -> None:
    """First find of an invited player: the inviter gets points once (ref_id = invited user)."""
    user = await users.get_user(session, user_id)
    if user is None or user.referred_by is None:
        return
    if await repo.has_other_find(session, user_id, except_find=find_id):
        return
    wallet.add_points(
        session,
        user.referred_by,
        get_settings().referral_bonus_points,
        LedgerReason.REFERRAL,
        user_id,
    )


async def _cleanup(
    session: AsyncSession, storage: Storage, attempt_id: uuid.UUID, photo_key: str | None
) -> None:
    """NFT-06: the player's photo and coordinates don't outlive the verdict."""
    if photo_key:
        await storage.delete(photo_key)
    attempt = await repo.get_attempt(session, attempt_id)
    if attempt is not None:
        attempt.photo_key = None
        attempt.gps = None
        attempt.accuracy_m = None
        await session.commit()
