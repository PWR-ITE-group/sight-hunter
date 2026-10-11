import uuid
from collections.abc import Sequence

from sqlalchemy import Row, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.social.models import ReelComment


def add_comment(session: AsyncSession, comment: ReelComment) -> ReelComment:
    session.add(comment)
    return comment


async def comments_page(
    session: AsyncSession, reel_id: uuid.UUID, offset: int, limit: int
) -> Sequence[Row[ReelComment, str | None]]:
    rows: Sequence[Row[ReelComment, str | None]] = (
        await session.execute(
            select(ReelComment, User.nickname)
            .join(User, User.id == ReelComment.user_id)
            .where(ReelComment.reel_id == reel_id)
            .order_by(ReelComment.created_at.desc(), ReelComment.id)
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return rows
