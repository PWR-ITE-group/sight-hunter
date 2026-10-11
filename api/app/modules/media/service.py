import base64
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import not_found
from app.modules.auth.models import User
from app.modules.media import repository as repo
from app.modules.media.models import Reel, ReelUnlock, UnlockSource
from app.modules.media.schemas import FeedOut, ReelOut
from app.modules.social.models import ReelView

PAGE_SIZE = 20


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


def is_locked(reel: Reel, unlocked: bool) -> bool:
    """Reward reels open with a find; public reels are free unless they carry a price."""
    if unlocked:
        return False
    return reel.kind == "reward" or reel.price_points is not None


def _decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        return max(0, int(base64.urlsafe_b64decode(cursor.encode()).decode()))
    except (ValueError, UnicodeDecodeError):
        return 0


def _encode_cursor(offset: int) -> str:
    return base64.urlsafe_b64encode(str(offset).encode()).decode()


async def feed(session: AsyncSession, user: User, cursor: str | None) -> FeedOut:
    offset = _decode_cursor(cursor)
    rows = await repo.feed_page(session, user.id, offset, PAGE_SIZE + 1)
    items = []
    for reel, unlocked, finders in rows[:PAGE_SIZE]:
        locked = is_locked(reel, unlocked)
        items.append(
            ReelOut(
                id=reel.id,
                place_id=reel.place_id,
                kind=reel.kind,
                title=reel.title,
                locked=locked,
                playback_url=None if locked else reel.playback_url,
                duration_s=reel.duration_s,
                finders_count=finders,
                price_points=reel.price_points,
            )
        )
    next_cursor = _encode_cursor(offset + PAGE_SIZE) if len(rows) > PAGE_SIZE else None
    return FeedOut(items=items, next_cursor=next_cursor)


async def count_view(session: AsyncSession, user: User, reel_id: uuid.UUID) -> None:
    if await repo.get_reel(session, reel_id) is None:
        raise not_found("reel")
    repo.add_view(session, ReelView(reel_id=reel_id, user_id=user.id))
    await session.commit()
