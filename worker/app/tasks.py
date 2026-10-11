"""The `verify_attempt` pipeline: photo -> embedding -> nearest refs -> thresholds -> judge."""

import asyncio
import logging
import time
from dataclasses import dataclass
from uuid import UUID

import numpy as np
from arq import Retry
from PIL import UnidentifiedImageError

from app.decision import Reason, Status, Verdict, assess, resolve_gray
from app.embedder import Embedder, load_image
from app.judge import Judge, JudgeRequest
from app.repository import AttemptRepository, Claim
from app.settings import Settings
from app.storage import PhotoStorage
from app.verdicts import VerdictSink

log = logging.getLogger(__name__)

JUDGE_TIMEOUT_S = 8.0


@dataclass
class Deps:
    settings: Settings
    repo: AttemptRepository
    storage: PhotoStorage
    embedder: Embedder
    judge: Judge
    verdicts: VerdictSink


async def _judge(deps: Deps, claim: Claim, photo: bytes, vec: np.ndarray) -> bool | None:
    if not deps.judge.enabled:
        return None
    try:
        keys = await claim.reference_keys(claim.target_place_id, vec, deps.settings.judge_max_refs)
        refs = [await deps.storage.fetch(k) for k in keys]
        req = JudgeRequest(photo=photo, references=refs, place_name=claim.target_name)
        return await asyncio.wait_for(deps.judge.compare(req), JUDGE_TIMEOUT_S)
    except Exception:
        log.exception("judge %s failed, falling back to thresholds", deps.judge.name)
        return None


async def _decide(deps: Deps, claim: Claim, photo: bytes) -> Verdict:
    try:
        img = load_image(photo)
    except (UnidentifiedImageError, OSError):
        log.warning("attempt %s: photo is not a readable image", claim.attempt_id)
        return Verdict(Status.REJECTED, 0.0, Reason.NOT_MATCHED)

    # The model is CPU-bound; a thread keeps arq's event loop (heartbeats, timeouts) alive.
    vec = await asyncio.to_thread(deps.embedder.embed, img)
    scores = await claim.place_scores(vec, deps.settings.search_top_k)
    target = next(s for s in scores if s.place_id == claim.target_place_id)
    th = deps.settings.thresholds

    a = assess(scores, target, th)
    if a.verdict is not None:
        return a.verdict
    return resolve_gray(a, th, await _judge(deps, claim, photo, vec), deps.judge.name)


# Statuses in which the attempt may still become `queued`: the API's submit transaction is not
# committed yet (or was rolled back and the client will retry). The job is retried, not dropped.
NOT_READY = {"awaiting_upload", "queued"}
RETRY_AFTER_S = 2


async def run_verification(deps: Deps, attempt_id: UUID) -> Verdict | None:
    """Verifies a queued attempt; None when it is already decided or gone.

    Raises `arq.Retry` when the row is not (yet) `queued`, so a job that overtook the API's
    commit is run again instead of leaving the attempt hanging.
    """
    started = time.perf_counter()
    async with deps.repo.claim(attempt_id) as claim:
        if claim is None:
            status = await deps.repo.status(attempt_id)
            if status in NOT_READY:
                log.info("attempt %s is %s, not claimable yet; retrying", attempt_id, status)
                raise Retry(defer=RETRY_AFTER_S)
            log.info("attempt %s is %s (already verified or gone), skipping", attempt_id, status)
            return None
        photo_key = claim.photo_key
        photo = await deps.storage.fetch(photo_key)
        verdict = await _decide(deps, claim, photo)

    # The row lock is released; the API applies the verdict (status, reward, photo deletion).
    # An exception here makes arq retry the job, and the API ignores a duplicate verdict.
    await deps.verdicts.publish(attempt_id, verdict)
    if deps.settings.delete_photo_after_verdict:
        try:
            await deps.storage.delete(photo_key)
        except Exception:
            log.exception("could not delete player photo %s", photo_key)

    log.info("attempt %s: %s reason=%s score=%.3f judge=%s in %.0f ms", attempt_id,
             verdict.status.value, verdict.reason, verdict.score, verdict.judge,
             (time.perf_counter() - started) * 1000)
    return verdict


async def verify_attempt(
    ctx: dict[str, object],
    attempt_id: str,
    photo_key: str | None = None,
    place_id: str | None = None,
) -> str | None:
    """arq job enqueued by the API as `verify_attempt(attempt_id, photo_key, place_id)`.

    `photo_key` and `place_id` are informational: the attempt row is the source of truth and is
    locked while it is verified. The API enqueues with `_job_id=f"verify:{attempt_id}"`.
    """
    deps = ctx["deps"]
    assert isinstance(deps, Deps)
    verdict = await run_verification(deps, UUID(attempt_id))
    return verdict.status.value if verdict else None
