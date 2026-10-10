import math
import uuid
from typing import Any

from fastapi import status
from geoalchemy2 import Geometry
from sqlalchemy import cast, exists, func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, not_found
from app.core.idempotency import run_idempotent
from app.modules.auth.models import User
from app.modules.finds.models import Attempt, AttemptStatus, Find
from app.modules.quests.models import Place, RoundStatus, Task, TaskRound
from app.modules.quests.schemas import HintOut, NearbyOut, PlaceMarker, RoundOut, TaskOut, Zone


def geo_point(lng: float, lat: float) -> Any:
    return func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)


def place_lng_lat() -> Any:
    """Columns `lng, lat` of a place: geography → geometry → X/Y."""
    g = cast(Place.geom, Geometry)
    return func.ST_X(g), func.ST_Y(g)


def search_zone(place_id: uuid.UUID, lat: float, lng: float, radius_m: int) -> Zone:
    """Where the map shows an unfound place: a circle that contains it but is not centred on it.

    The offset is derived from the place id, so it is stable between requests and the circle
    cannot be averaged out by reloading the map.
    """
    zone_r = max(150, 3 * radius_m)
    h = place_id.int
    angle = (h % 360) * math.pi / 180
    max_shift = zone_r - radius_m - 10
    shift = (max_shift * 0.4) + ((h >> 16) % 1000) / 1000 * (max_shift * 0.6)
    d_lat = shift * math.cos(angle) / 111_320
    d_lng = shift * math.sin(angle) / (111_320 * math.cos(math.radians(lat)))
    return Zone(lat=lat + d_lat, lng=lng + d_lng, radius_m=zone_r)


async def nearby(
    session: AsyncSession, user: User, lat: float, lng: float, radius_m: int
) -> NearbyOut:
    lng_col, lat_col = place_lng_lat()
    found_q = exists().where(Find.user_id == user.id, Find.task_id == Task.id)
    # One task per place is assumed; with several, the oldest one is the map marker.
    rows = (
        await session.execute(
            select(Place, Task.id, lng_col, lat_col, found_q.label("found"))
            .join(Task, Task.place_id == Place.id)
            .where(func.ST_DWithin(Place.geom, geo_point(lng, lat), radius_m))
            .order_by(Place.id, Task.created_at)
            .ext(distinct_on(Place.id))
        )
    ).all()
    items = []
    for place, task_id, p_lng, p_lat, found in rows:
        if found:
            zone = Zone(lat=p_lat, lng=p_lng, radius_m=place.radius_m)
        else:
            zone = search_zone(place.id, p_lat, p_lng, place.radius_m)
        items.append(
            PlaceMarker(
                id=place.id,
                task_id=task_id,
                found=found,
                name=place.name if found else None,
                zone=zone,
            )
        )
    return NearbyOut(items=items)


async def _active_round(
    session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> TaskRound | None:
    return await session.scalar(
        select(TaskRound).where(
            TaskRound.user_id == user_id,
            TaskRound.task_id == task_id,
            TaskRound.status == RoundStatus.ACTIVE,
        )
    )


async def get_task(session: AsyncSession, user: User, task_id: uuid.UUID) -> TaskOut:
    task = await session.get(Task, task_id)
    if task is None:
        raise not_found("task")
    active = await _active_round(session, user.id, task_id)
    return TaskOut(
        id=task.id,
        place_id=task.place_id,
        riddle=task.riddle,
        archival_photo_url=task.archival_photo_url,
        hints_total=min(len(task.hints), get_settings().max_hints_per_round),
        reward_points=active.reward_points if active else task.base_reward_points,
        reward_xp=active.reward_xp if active else task.base_xp,
    )


async def attempts_used(session: AsyncSession, round_id: uuid.UUID) -> int:
    """Attempts that got past the geofence and were submitted; abandoned uploads don't count."""
    n = await session.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.round_id == round_id, Attempt.status != AttemptStatus.AWAITING_UPLOAD)
    )
    return int(n or 0)


async def round_out(session: AsyncSession, rnd: TaskRound, task: Task) -> RoundOut:
    used = await attempts_used(session, rnd.id)
    return RoundOut(
        id=rnd.id,
        task_id=rnd.task_id,
        status=rnd.status,
        hints_used=rnd.hints_used,
        hints=list(task.hints[: rnd.hints_used]),
        reward_points=rnd.reward_points,
        attempts_left=max(0, get_settings().max_attempts_per_round - used),
        started_at=rnd.started_at,
    )


async def start_round(
    session: AsyncSession, user: User, task_id: uuid.UUID
) -> tuple[bool, RoundOut]:
    """Returns (created, round). A repeat tap returns the existing active round."""
    task = await session.get(Task, task_id)
    if task is None:
        raise not_found("task")
    active = await _active_round(session, user.id, task_id)
    if active is not None:
        return False, await round_out(session, active, task)
    already = await session.scalar(
        select(Find.id).where(Find.user_id == user.id, Find.task_id == task_id)
    )
    if already is not None:
        raise AppError(
            "round_not_active", status.HTTP_409_CONFLICT, message="To miejsce jest już odkryte."
        )
    rnd = TaskRound(
        user_id=user.id,
        task_id=task_id,
        reward_points=task.base_reward_points,
        reward_xp=task.base_xp,
    )
    session.add(rnd)
    try:
        await session.commit()
    except IntegrityError:
        # Two taps raced on the "one active round" index; the first one won.
        await session.rollback()
        active = await _active_round(session, user.id, task_id)
        if active is None:
            raise
        return False, await round_out(session, active, task)
    await session.refresh(rnd)
    return True, await round_out(session, rnd, task)


def reward_after_hints(base_points: int, hints_used: int) -> int:
    s = get_settings()
    factor = max(s.hint_floor, 1 - s.hint_penalty * hints_used)
    return round(base_points * factor)


async def use_hint(
    session: AsyncSession, user: User, round_id: uuid.UUID, key: uuid.UUID
) -> tuple[int, dict[str, Any]]:
    async def op() -> tuple[int, dict[str, Any]]:
        rnd = await session.get(TaskRound, round_id, with_for_update=True)
        if rnd is None or rnd.user_id != user.id:
            raise not_found("round")
        if rnd.status != RoundStatus.ACTIVE:
            raise AppError("round_not_active", status.HTTP_409_CONFLICT)
        task = await session.get(Task, rnd.task_id)
        assert task is not None
        limit = min(len(task.hints), get_settings().max_hints_per_round)
        if rnd.hints_used >= limit:
            raise AppError("no_hints_left", status.HTTP_409_CONFLICT)
        rnd.hints_used += 1
        # Only the round's points shrink; XP and the player's balance are untouched.
        rnd.reward_points = reward_after_hints(task.base_reward_points, rnd.hints_used)
        out = HintOut(
            hint_text=task.hints[rnd.hints_used - 1],
            hints_used=rnd.hints_used,
            reward_points=rnd.reward_points,
        )
        return status.HTTP_200_OK, out.model_dump()

    return await run_idempotent(session, user.id, key, "hint", op)
