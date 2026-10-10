"""arq worker for the API's own queue: applies verdicts coming from the ML worker.

arq app.worker.WorkerSettings
"""

import uuid
from typing import Any

from app.core.db import get_engine, get_sessionmaker
from app.core.redis import API_QUEUE, arq_settings, get_redis
from app.core.storage import get_storage
from app.modules.finds import service as finds


async def apply_verdict(
    ctx: dict[str, Any],
    attempt_id: str,
    verdict: str,
    score: float | None = None,
    matched_place_id: str | None = None,
) -> None:
    if verdict not in ("accepted", "rejected"):
        raise ValueError(f"unknown verdict {verdict!r} for attempt {attempt_id}")
    outcome: finds.Verdict = "accepted" if verdict == "accepted" else "rejected"
    async with get_sessionmaker()() as session:
        await finds.apply_verdict(
            session,
            get_redis(),
            get_storage(),
            uuid.UUID(attempt_id),
            outcome,
            score,
            uuid.UUID(matched_place_id) if matched_place_id else None,
        )


async def shutdown(ctx: dict[str, Any]) -> None:
    await get_redis().aclose()
    await get_engine().dispose()


class WorkerSettings:
    functions = [apply_verdict]
    queue_name = API_QUEUE
    on_shutdown = shutdown
    redis_settings = arq_settings()
    max_tries = 3
