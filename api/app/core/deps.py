import uuid
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import unauthorized
from app.core.redis import get_redis
from app.core.security import decode_token
from app.core.storage import Storage, get_storage
from app.modules.auth.models import User

_bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]
StorageDep = Annotated[Storage, Depends(get_storage)]


async def current_user(
    session: SessionDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if creds is None:
        raise unauthorized()
    payload = decode_token(creds.credentials, "access")
    if payload is None:
        raise unauthorized()
    user = await session.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(current_user)]

IdempotencyKeyDep = Annotated[uuid.UUID, Header(alias="Idempotency-Key")]
