from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from sqlalchemy import text

from app.core.db import get_engine
from app.core.errors import install_error_handlers
from app.core.redis import close_arq, get_redis


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await close_arq()
    await get_redis().aclose()
    await get_engine().dispose()


def create_app() -> FastAPI:
    app = FastAPI(title="Łowcy Historii API", version="0.1.0", lifespan=lifespan)
    install_error_handlers(app)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        await get_redis().ping()
        return {"status": "ok"}

    api = APIRouter(prefix="/api/v1")
    app.include_router(api)
    return app


app = create_app()
