import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import IdempotencyKey

Result = tuple[int, dict[str, Any]]


async def run_idempotent(
    session: AsyncSession,
    user_id: uuid.UUID,
    key: uuid.UUID,
    scope: str,
    op: Callable[[], Awaitable[Result]],
) -> Result:
    """Runs `op` once per (user, key). A repeated key returns the first response.

    `op` must do its writes on `session` and must not commit: the key row is stored in the same
    transaction, so either both land or neither does. Two concurrent calls with the same key race
    on the primary key; the loser rolls back and returns the winner's stored response.
    """
    existing = await session.get(IdempotencyKey, (user_id, key))
    if existing is not None:
        return existing.status_code, existing.response

    status_code, body = await op()
    session.add(
        IdempotencyKey(
            user_id=user_id, key=key, scope=scope, status_code=status_code, response=body
        )
    )
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        stored = await session.get(IdempotencyKey, (user_id, key))
        if stored is None:
            raise
        return stored.status_code, stored.response
    return status_code, body
