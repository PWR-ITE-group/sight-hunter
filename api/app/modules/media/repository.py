import uuid
from collections.abc import Sequence

from sqlalchemy import Row, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finds.models import Find
from app.modules.media.models import Reel, ReelKind, ReelUnlock
from app.modules.quests.models import Task
from app.modules.social.models import ReelLike, ReelView


async def get_reel(session: AsyncSession, reel_id: uuid.UUID) -> Reel | None:
    return await session.get(Reel, reel_id)


async def get_reward_reel(session: AsyncSession, place_id: uuid.UUID) -> Reel | None:
    return await session.scalar(
        select(Reel).where(Reel.place_id == place_id, Reel.kind == ReelKind.REWARD)
    )


def add_unlock(session: AsyncSession, unlock: ReelUnlock) -> ReelUnlock:
    session.add(unlock)
    return unlock


async def is_unlocked(session: AsyncSession, user_id: uuid.UUID, reel_id: uuid.UUID) -> bool:
    return await session.get(ReelUnlock, (user_id, reel_id)) is not None


async def unlocked_reel_id_for_task(
    session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> uuid.UUID | None:
    return await session.scalar(
        select(ReelUnlock.reel_id)
        .join(Reel, Reel.id == ReelUnlock.reel_id)
        .join(Task, Task.place_id == Reel.place_id)
        .where(ReelUnlock.user_id == user_id, Task.id == task_id)
    )


async def feed_page(
    session: AsyncSession, user_id: uuid.UUID, offset: int, limit: int
) -> Sequence[Row[Reel, bool, int, int, bool]]:
    """(reel, unlocked, finders_count, likes_count, liked_by_me), newest first."""
    unlocked = exists().where(ReelUnlock.user_id == user_id, ReelUnlock.reel_id == Reel.id)
    finders = (
        select(func.count())
        .select_from(Find)
        .join(Task, Task.id == Find.task_id)
        .where(Task.place_id == Reel.place_id)
        .scalar_subquery()
    )
    likes = select(func.count()).where(ReelLike.reel_id == Reel.id).scalar_subquery()
    liked = exists().where(ReelLike.user_id == user_id, ReelLike.reel_id == Reel.id)
    rows: Sequence[Row[Reel, bool, int, int, bool]] = (
        await session.execute(
            select(Reel, unlocked.label("unlocked"), finders, likes, liked.label("liked"))
            .order_by(Reel.created_at.desc(), Reel.id)
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return rows


async def purchasable_reels(session: AsyncSession, user_id: uuid.UUID) -> Sequence[Reel]:
    """Public reels with a price the player hasn't unlocked yet."""
    owned = exists().where(ReelUnlock.user_id == user_id, ReelUnlock.reel_id == Reel.id)
    return (
        await session.scalars(
            select(Reel)
            .where(Reel.kind == ReelKind.PUBLIC, Reel.price_points.is_not(None), ~owned)
            .order_by(Reel.price_points, Reel.title)
        )
    ).all()


def add_view(session: AsyncSession, view: ReelView) -> ReelView:
    session.add(view)
    return view
