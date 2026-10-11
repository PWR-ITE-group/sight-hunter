from typing import Any

from pgvector.asyncpg import register_vector
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def create_engine(database_url: str) -> AsyncEngine:
    engine = create_async_engine(database_url, pool_pre_ping=True, pool_size=4)

    # Teach asyncpg the `vector` type so numpy arrays can be passed as query parameters.
    @event.listens_for(engine.sync_engine, "connect")
    def _register_vector(dbapi_connection: Any, _record: Any) -> None:
        dbapi_connection.run_async(register_vector)

    return engine
