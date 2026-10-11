"""Hand-off of the verdict to the API (owner A).

The worker never writes `attempts` itself: every verdict goes back as an `apply_verdict` job on
the API's arq queue (contract in api/app/worker.py). The API applies it in one transaction:
attempt status, reason, reward, reel unlock, round close, then deletes the player photo.
"""

import logging
from typing import Protocol
from uuid import UUID

from arq import ArqRedis

from app.decision import Verdict

log = logging.getLogger(__name__)


class VerdictSink(Protocol):
    async def publish(self, attempt_id: UUID, verdict: Verdict) -> None: ...


class ArqVerdictSink:
    """Enqueues `apply_verdict(attempt_id, verdict, score, matched_place_id)` for the API worker.

    The job id makes a retried verification idempotent: arq keeps one job per attempt, and
    the API ignores verdicts for attempts that are no longer `queued`.
    """

    def __init__(self, pool: ArqRedis, queue_name: str) -> None:
        self.pool = pool
        self.queue_name = queue_name

    async def publish(self, attempt_id: UUID, verdict: Verdict) -> None:
        matched = str(verdict.matched_place_id) if verdict.matched_place_id else None
        job = await self.pool.enqueue_job(
            "apply_verdict",
            str(attempt_id),
            verdict.status.value,
            verdict.score,
            matched,
            _queue_name=self.queue_name,
            _job_id=f"verdict:{attempt_id}",
        )
        if job is None:
            log.info("verdict for attempt %s is already queued for the API", attempt_id)
