import enum
from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy import Enum
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def str_enum(enum_cls: type[enum.StrEnum], name: str, length: int = 20) -> Enum:
    """VARCHAR column holding the enum *values* (SQLAlchemy stores member names by default)."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        length=length,
        values_callable=lambda cls: [m.value for m in cls],
    )


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(get_settings().db_url, pool_pre_ping=True)


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Request-scoped session. Services commit explicitly; anything left open is rolled back."""
    async with get_sessionmaker()() as session:
        yield session
