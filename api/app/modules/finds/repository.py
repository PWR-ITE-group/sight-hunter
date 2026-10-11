import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finds.models import Attempt, Find


async def get_attempt(session: AsyncSession, attempt_id: uuid.UUID) -> Attempt | None:
    return await session.get(Attempt, attempt_id)


async def get_attempt_for_update(session: AsyncSession, attempt_id: uuid.UUID) -> Attempt | None:
    return await session.get(Attempt, attempt_id, with_for_update=True)


def add_attempt(session: AsyncSession, attempt: Attempt) -> Attempt:
    session.add(attempt)
    return attempt


async def get_find_by_attempt(session: AsyncSession, attempt_id: uuid.UUID) -> Find | None:
    return await session.scalar(select(Find).where(Find.attempt_id == attempt_id))


def add_find(session: AsyncSession, find: Find) -> Find:
    session.add(find)
    return find


async def has_other_find(session: AsyncSession, user_id: uuid.UUID, except_find: uuid.UUID) -> bool:
    row = await session.scalar(
        select(Find.id).where(Find.user_id == user_id, Find.id != except_find).limit(1)
    )
    return row is not None
