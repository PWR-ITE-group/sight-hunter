import uuid
from collections.abc import Sequence

from geoalchemy2 import Geometry
from sqlalchemy import Row, cast, exists, func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.geo import geo_point
from app.modules.finds.models import Attempt, AttemptStatus, Find
from app.modules.quests.models import Place, RoundStatus, Task, TaskRound


async def places_near(
    session: AsyncSession, user_id: uuid.UUID, lat: float, lng: float, radius_m: int
) -> Sequence[Row[Place, uuid.UUID, float, float, bool]]:
    """Rows of (place, task_id, lng, lat, found) within the radius, one task per place."""
    g = cast(Place.geom, Geometry)
    found = exists().where(Find.user_id == user_id, Find.task_id == Task.id)
    rows: Sequence[Row[Place, uuid.UUID, float, float, bool]] = (
        await session.execute(
            select(Place, Task.id, func.ST_X(g), func.ST_Y(g), found.label("found"))
            .join(Task, Task.place_id == Place.id)
            .where(func.ST_DWithin(Place.geom, geo_point(lng, lat), radius_m))
            .order_by(Place.id, Task.created_at)
            .ext(distinct_on(Place.id))
        )
    ).all()
    return rows


async def get_place(session: AsyncSession, place_id: uuid.UUID) -> Place | None:
    return await session.get(Place, place_id)


async def distance_to_place_m(
    session: AsyncSession, place_id: uuid.UUID, lat: float, lng: float
) -> float:
    d = await session.scalar(
        select(Place.geom.ST_Distance(geo_point(lng, lat))).where(Place.id == place_id)
    )
    return float(d or 0)


async def get_task(session: AsyncSession, task_id: uuid.UUID) -> Task | None:
    return await session.get(Task, task_id)


async def get_active_round(
    session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> TaskRound | None:
    return await session.scalar(
        select(TaskRound).where(
            TaskRound.user_id == user_id,
            TaskRound.task_id == task_id,
            TaskRound.status == RoundStatus.ACTIVE,
        )
    )


async def get_round(session: AsyncSession, round_id: uuid.UUID) -> TaskRound | None:
    return await session.get(TaskRound, round_id)


async def get_round_for_update(session: AsyncSession, round_id: uuid.UUID) -> TaskRound | None:
    return await session.get(TaskRound, round_id, with_for_update=True)


def add_round(session: AsyncSession, rnd: TaskRound) -> TaskRound:
    session.add(rnd)
    return rnd


async def has_find(session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID) -> bool:
    row = await session.scalar(
        select(Find.id).where(Find.user_id == user_id, Find.task_id == task_id)
    )
    return row is not None


async def count_submitted_attempts(session: AsyncSession, round_id: uuid.UUID) -> int:
    """Attempts that got past the geofence and were submitted; abandoned uploads don't count."""
    n = await session.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.round_id == round_id, Attempt.status != AttemptStatus.AWAITING_UPLOAD)
    )
    return int(n or 0)


async def unfound_places_by_distance(
    session: AsyncSession, user_id: uuid.UUID, lat: float, lng: float, limit: int
) -> Sequence[Row[Place, uuid.UUID, float, float, float, int]]:
    """(place, task_id, lng, lat, distance_m, finders) the player hasn't found, nearest first."""
    g = cast(Place.geom, Geometry)
    # One task per place is assumed; with several, the oldest one is used.
    task_id = (
        select(Task.id)
        .where(Task.place_id == Place.id)
        .order_by(Task.created_at)
        .limit(1)
        .scalar_subquery()
    )
    # Both correlate on Place directly: a nested scalar subquery would not correlate right.
    found = exists().where(
        Find.user_id == user_id, Find.task_id == Task.id, Task.place_id == Place.id
    )
    finders = (
        select(func.count())
        .select_from(Find)
        .join(Task, Task.id == Find.task_id)
        .where(Task.place_id == Place.id)
        .scalar_subquery()
    )
    distance = Place.geom.ST_Distance(geo_point(lng, lat))
    rows: Sequence[Row[Place, uuid.UUID, float, float, float, int]] = (
        await session.execute(
            select(Place, task_id, func.ST_X(g), func.ST_Y(g), distance, finders)
            .where(task_id.is_not(None), ~found)
            .order_by(distance)
            .limit(limit)
        )
    ).all()
    return rows
