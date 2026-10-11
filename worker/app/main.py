"""arq entry point: `arq app.main.WorkerSettings`."""

import logging
from typing import Any, ClassVar

from arq import create_pool
from arq.connections import RedisSettings

from app.db import create_engine
from app.embedder import build_embedder
from app.judge import build_judge
from app.repository import SqlAttemptRepository
from app.settings import get_settings
from app.storage import build_storage
from app.tasks import Deps, verify_attempt
from app.verdicts import ArqVerdictSink

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("worker")


async def startup(ctx: dict[str, Any]) -> None:
    settings = get_settings()
    log.info("loading %s on %s", settings.model_name, settings.model_device)
    embedder = build_embedder(settings.model_name, settings.model_device, settings.embed_flip_tta)
    engine = create_engine(settings.database_url)
    # Verdicts go back to the API on its own queue; one pool for the worker's lifetime.
    api_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    ctx["engine"] = engine
    ctx["api_pool"] = api_pool
    ctx["deps"] = Deps(
        settings=settings,
        repo=SqlAttemptRepository(engine),
        storage=build_storage(settings),
        embedder=embedder,
        judge=build_judge(settings),
        verdicts=ArqVerdictSink(api_pool, settings.api_queue),
    )
    log.info("ready: queue=%s -> %s thresholds=%s judge=%s", settings.arq_queue,
             settings.api_queue, settings.thresholds.model_dump(), settings.judge_provider)


async def shutdown(ctx: dict[str, Any]) -> None:
    await ctx["api_pool"].aclose()
    await ctx["engine"].dispose()


class WorkerSettings:
    functions: ClassVar = [verify_attempt]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    queue_name = get_settings().arq_queue
    # The model is CPU-bound; more parallel jobs only make each one slower.
    max_jobs = 2
    job_timeout = 60
