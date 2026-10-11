"""All SQL the worker runs: read-only. Tables come from the API's Alembic migrations
(api/alembic); worker/dev/schema.sql mirrors the columns used here. Verdicts go back to the API
as jobs (app/verdicts.py), never as writes to `attempts`."""

from collections.abc import AsyncIterator
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.decision import PlaceScore


class Claim(Protocol):
    """A queued attempt locked for this worker until the context manager exits."""

    attempt_id: UUID
    photo_key: str
    target_place_id: UUID
    target_name: str

    async def place_scores(self, vec: np.ndarray, top_k: int) -> list[PlaceScore]:
        """Best similarity per place among the nearest refs; always includes the target."""
        ...

    async def reference_keys(self, place_id: UUID, vec: np.ndarray, n: int) -> list[str]: ...


class AttemptRepository(Protocol):
    def claim(self, attempt_id: UUID) -> AbstractAsyncContextManager[Claim | None]: ...


_CLAIM = text("""
    SELECT a.id, a.photo_key, t.place_id, p.name
    FROM attempts a
    JOIN task_rounds r ON r.id = a.round_id
    JOIN tasks t ON t.id = r.task_id
    JOIN places p ON p.id = t.place_id
    WHERE a.id = :id AND a.status = 'queued'
    FOR UPDATE OF a SKIP LOCKED
""")

_NEAREST = text("""
    SELECT r.place_id, p.name, 1 - (r.embedding <=> :q) AS sim
    FROM place_refs r JOIN places p ON p.id = r.place_id
    ORDER BY r.embedding <=> :q
    LIMIT :k
""")

# Exact best score for the target, in case none of its refs made it into the top-k.
_TARGET_BEST = text("""
    SELECT max(1 - (embedding <=> :q)) FROM place_refs WHERE place_id = :pid
""")

_REF_KEYS = text("""
    SELECT photo_url FROM place_refs WHERE place_id = :pid
    ORDER BY embedding <=> :q LIMIT :n
""")

@dataclass
class SqlClaim:
    conn: AsyncConnection
    attempt_id: UUID
    photo_key: str
    target_place_id: UUID
    target_name: str

    async def place_scores(self, vec: np.ndarray, top_k: int) -> list[PlaceScore]:
        best: dict[UUID, PlaceScore] = {}
        for place_id, name, sim in await self.conn.execute(_NEAREST, {"q": vec, "k": top_k}):
            if place_id not in best or sim > best[place_id].score:
                best[place_id] = PlaceScore(place_id, name, float(sim))
        if self.target_place_id not in best:
            sim = await self.conn.scalar(_TARGET_BEST, {"q": vec, "pid": self.target_place_id})
            best[self.target_place_id] = PlaceScore(
                self.target_place_id, self.target_name, float(sim) if sim is not None else 0.0
            )
        return sorted(best.values(), key=lambda s: s.score, reverse=True)

    async def reference_keys(self, place_id: UUID, vec: np.ndarray, n: int) -> list[str]:
        rows = await self.conn.execute(_REF_KEYS, {"pid": place_id, "q": vec, "n": n})
        return [r[0] for r in rows]


class SqlAttemptRepository:
    def __init__(self, engine: AsyncEngine) -> None:
        self.engine = engine

    @asynccontextmanager
    async def claim(self, attempt_id: UUID) -> AsyncIterator[SqlClaim | None]:
        async with self.engine.begin() as conn:
            row = (await conn.execute(_CLAIM, {"id": attempt_id})).first()
            if row is None:
                yield None
                return
            yield SqlClaim(conn, row[0], row[1], row[2], row[3])
