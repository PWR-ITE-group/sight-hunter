import base64
import uuid

from fastapi import status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import ratelimit
from app.core.config import get_settings
from app.core.errors import AppError, not_found
from app.modules.auth.models import User
from app.modules.media import repository as reels
from app.modules.quests import repository as quests
from app.modules.social import repository as repo
from app.modules.social.models import ReelComment
from app.modules.social.schemas import CommentOut, CommentsOut, ShareLinkOut

PAGE_SIZE = 30
COMMENTS_PER_MINUTE = 10
ANONYMOUS = "Gracz"


async def _require_reel(session: AsyncSession, reel_id: uuid.UUID) -> None:
    if await reels.get_reel(session, reel_id) is None:
        raise not_found("reel")


def _decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        return max(0, int(base64.urlsafe_b64decode(cursor.encode()).decode()))
    except (ValueError, UnicodeDecodeError):
        return 0


async def list_comments(
    session: AsyncSession, reel_id: uuid.UUID, cursor: str | None
) -> CommentsOut:
    await _require_reel(session, reel_id)
    offset = _decode_cursor(cursor)
    rows = await repo.comments_page(session, reel_id, offset, PAGE_SIZE + 1)
    items = [
        CommentOut(id=c.id, author_nickname=nick or ANONYMOUS, text=c.text, created_at=c.created_at)
        for c, nick in rows[:PAGE_SIZE]
    ]
    next_cursor = (
        base64.urlsafe_b64encode(str(offset + PAGE_SIZE).encode()).decode()
        if len(rows) > PAGE_SIZE
        else None
    )
    return CommentsOut(items=items, next_cursor=next_cursor)


async def add_comment(
    session: AsyncSession, redis: Redis, user: User, reel_id: uuid.UUID, text: str
) -> CommentOut:
    await _require_reel(session, reel_id)
    if not await ratelimit.hit(redis, f"rl:comment:{user.id}", COMMENTS_PER_MINUTE, 60):
        raise AppError("rate_limited", status.HTTP_429_TOO_MANY_REQUESTS)
    comment = repo.add_comment(
        session, ReelComment(reel_id=reel_id, user_id=user.id, text=text.strip())
    )
    await session.commit()
    await session.refresh(comment)
    return CommentOut(
        id=comment.id,
        author_nickname=user.nickname or ANONYMOUS,
        text=comment.text,
        created_at=comment.created_at,
    )


async def share_link(session: AsyncSession, user: User, task_id: uuid.UUID) -> ShareLinkOut:
    if await quests.get_task(session, task_id) is None:
        raise not_found("task")
    base = get_settings().share_base_url.rstrip("/")
    return ShareLinkOut(url=f"{base}/t/{task_id}?ref={user.ref_code}")
