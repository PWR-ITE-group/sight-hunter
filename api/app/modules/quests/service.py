import math
import random
import uuid
from typing import Any

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, not_found
from app.core.geo import haversine_m
from app.core.idempotency import run_idempotent
from app.modules.auth.models import User
from app.modules.quests import repository as repo
from app.modules.quests.models import RoundStatus, Task, TaskRound
from app.modules.quests.schemas import (
    HintOut,
    NearbyOut,
    NextMode,
    NextPlaceOut,
    PlaceMarker,
    RoundOut,
    TaskOut,
    Zone,
)


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
    items = []
    for place, task_id, p_lng, p_lat, found in await repo.places_near(
        session, user.id, lat, lng, radius_m
    ):
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


RANDOM_POOL = 5


async def next_place(
    session: AsyncSession, user: User, lat: float, lng: float, mode: NextMode
) -> NextPlaceOut:
    """The next place to play: nearest, most found by everyone, or a random one nearby.

    Only unfound places qualify. The real point stays hidden: the zone is offset and the
    distance is measured to the zone's centre.
    """
    rows = await repo.unfound_places_by_distance(session, user.id, lat, lng, limit=50)
    if not rows:
        raise not_found("place")
    if mode == "popular":
        row = max(rows, key=lambda r: (r[5], -r[4]))  # most finders, then nearest
    elif mode == "random":
        row = random.choice(rows[:RANDOM_POOL])
    else:
        row = rows[0]
    place, task_id, p_lng, p_lat, _, _ = row
    zone = search_zone(place.id, p_lat, p_lng, place.radius_m)
    # Distance to the zone's centre, never to the real point: exact distances from a few
    # positions would let a player trilaterate the place without solving the riddle.
    return NextPlaceOut(
        id=place.id,
        task_id=task_id,
        found=False,
        name=None,
        zone=zone,
        distance_m=round(haversine_m(lat, lng, zone.lat, zone.lng)),
    )


async def get_task(session: AsyncSession, user: User, task_id: uuid.UUID) -> TaskOut:
    task = await repo.get_task(session, task_id)
    if task is None:
        raise not_found("task")
    active = await repo.get_active_round(session, user.id, task_id)
    return TaskOut(
        id=task.id,
        place_id=task.place_id,
        riddle=task.riddle,
        archival_photo_url=task.archival_photo_url,
        hints_total=min(len(task.hints), get_settings().max_hints_per_round),
        reward_points=active.reward_points if active else task.base_reward_points,
        reward_xp=active.reward_xp if active else task.base_xp,
    )


async def attempts_left(session: AsyncSession, round_id: uuid.UUID) -> int:
    used = await repo.count_submitted_attempts(session, round_id)
    return max(0, get_settings().max_attempts_per_round - used)


async def round_out(session: AsyncSession, rnd: TaskRound, task: Task) -> RoundOut:
    return RoundOut(
        id=rnd.id,
        task_id=rnd.task_id,
        status=rnd.status,
        hints_used=rnd.hints_used,
        hints=list(task.hints[: rnd.hints_used]),
        reward_points=rnd.reward_points,
        attempts_left=await attempts_left(session, rnd.id),
        started_at=rnd.started_at,
    )


async def start_round(
    session: AsyncSession, user: User, task_id: uuid.UUID
) -> tuple[bool, RoundOut]:
    """Returns (created, round). A repeat tap returns the existing active round."""
    task = await repo.get_task(session, task_id)
    if task is None:
        raise not_found("task")
    active = await repo.get_active_round(session, user.id, task_id)
    if active is not None:
        return False, await round_out(session, active, task)
    if await repo.has_find(session, user.id, task_id):
        raise AppError(
            "round_not_active", status.HTTP_409_CONFLICT, message="To miejsce jest już odkryte."
        )
    rnd = repo.add_round(
        session,
        TaskRound(
            user_id=user.id,
            task_id=task_id,
            reward_points=task.base_reward_points,
            reward_xp=task.base_xp,
        ),
    )
    try:
        await session.commit()
    except IntegrityError:
        # Two taps raced on the "one active round" index; the first one won.
        await session.rollback()
        active = await repo.get_active_round(session, user.id, task_id)
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
        rnd = await repo.get_round_for_update(session, round_id)
        if rnd is None or rnd.user_id != user.id:
            raise not_found("round")
        if rnd.status != RoundStatus.ACTIVE:
            raise AppError("round_not_active", status.HTTP_409_CONFLICT)
        task = await repo.get_task(session, rnd.task_id)
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
