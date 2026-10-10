from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from sqlalchemy import text

from app.core.db import get_engine
from app.core.errors import install_error_handlers
from app.core.redis import close_arq, get_redis
from app.modules.auth.router import auth_router, me_router
from app.modules.finds.router import attempts_router, rounds_attempts_router
from app.modules.quests.router import places_router, rounds_router, tasks_router


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
    api.include_router(auth_router)
    api.include_router(me_router)
    api.include_router(places_router)
    api.include_router(tasks_router)
    api.include_router(rounds_router)
    api.include_router(rounds_attempts_router)
    api.include_router(attempts_router)
    app.include_router(api)
    return app


app = create_app()
