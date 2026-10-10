"""Tests run against the real Postgres (PostGIS + pgvector) and Redis from docker compose.

A separate database `<POSTGRES_DB>_test` is created on first run and migrated with Alembic; tables
are truncated after every test. Storage is replaced by an in-memory fake, so no S3 is needed.
"""

import asyncio
import os
import uuid
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import Settings, get_settings

_base = Settings()
TEST_DB = f"{_base.postgres_db}_test"
os.environ["POSTGRES_DB"] = TEST_DB
os.environ["REDIS_URL"] = _base.redis_dsn.replace("/0", "/9")
# Tests pin the demo switches themselves (fixtures flip them), whatever the local .env says.
os.environ["DEMO_MODE"] = "false"
os.environ["VERIFY_STUB"] = "false"
get_settings.cache_clear()

from app.core.db import get_engine, get_sessionmaker  # noqa: E402
from app.core.redis import get_redis  # noqa: E402
from app.core.storage import Storage, get_storage  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import Base  # noqa: E402


class FakeStorage:
    def __init__(self) -> None:
        self.objects: set[str] = set()
        self.deleted: list[str] = []

    async def presign_put(self, key: str, content_type: str) -> tuple[str, datetime]:
        return f"http://storage.test/{key}?signed", datetime.now(UTC) + timedelta(minutes=5)

    async def exists(self, key: str) -> bool:
        return key in self.objects

    async def delete(self, key: str) -> None:
        self.objects.discard(key)
        self.deleted.append(key)

    def upload(self, key: str) -> None:
        """What the phone does with the presigned URL."""
        self.objects.add(key)


def _create_test_db() -> None:
    async def run() -> None:
        admin_url = _base.db_url.rsplit("/", 1)[0] + "/postgres"
        engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
        async with engine.connect() as conn:
            exists = await conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB}
            )
            if not exists:
                await conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
        await engine.dispose()

    asyncio.run(run())


@pytest.fixture(scope="session", autouse=True)
def migrated_db() -> Iterator[None]:
    _create_test_db()
    command.upgrade(Config("alembic.ini"), "head")
    yield


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def app(storage: FakeStorage) -> AsyncIterator[Any]:
    application = create_app()

    def _fake() -> Storage:
        return storage

    application.dependency_overrides[get_storage] = _fake
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
async def client(app: Any) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def session() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as s:
        yield s


@pytest.fixture
async def redis() -> AsyncIterator[Redis]:
    yield get_redis()


@pytest.fixture(autouse=True)
async def _clean_tables() -> AsyncIterator[None]:
    yield
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    async with get_engine().begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} CASCADE"))
    await get_redis().flushdb()


def unique_email() -> str:
    return f"{uuid.uuid4().hex[:10]}@test.pl"
