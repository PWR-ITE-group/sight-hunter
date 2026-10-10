import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.media.models import Reel, ReelKind, ReelUnlock
from app.modules.quests.models import Task


async def get_reward_reel(session: AsyncSession, place_id: uuid.UUID) -> Reel | None:
    return await session.scalar(
        select(Reel).where(Reel.place_id == place_id, Reel.kind == ReelKind.REWARD)
    )


def add_unlock(session: AsyncSession, unlock: ReelUnlock) -> ReelUnlock:
    session.add(unlock)
    return unlock


async def unlocked_reel_id_for_task(
    session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> uuid.UUID | None:
    return await session.scalar(
        select(ReelUnlock.reel_id)
        .join(Reel, Reel.id == ReelUnlock.reel_id)
        .join(Task, Task.place_id == Reel.place_id)
        .where(ReelUnlock.user_id == user_id, Task.id == task_id)
    )
