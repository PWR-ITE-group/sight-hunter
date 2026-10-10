import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.media import repository as repo
from app.modules.media.models import ReelUnlock, UnlockSource


async def unlock_reward_reel(
    session: AsyncSession, user_id: uuid.UUID, place_id: uuid.UUID
) -> uuid.UUID | None:
    """Opens the place's reward reel inside the caller's transaction; None if the place has none."""
    reel = await repo.get_reward_reel(session, place_id)
    if reel is None:
        return None
    repo.add_unlock(session, ReelUnlock(user_id=user_id, reel_id=reel.id, source=UnlockSource.FIND))
    return reel.id


async def unlocked_reel_for_task(
    session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> uuid.UUID | None:
    return await repo.unlocked_reel_id_for_task(session, user_id, task_id)
