"""XP leaderboard: Redis sorted sets, rebuilt from xp_ledger whenever a key is missing."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth import repository as users
from app.modules.auth.models import User
from app.modules.wallet import repository as repo
from app.modules.wallet.schemas import LeaderboardEntry, LeaderboardOut

Scope = Literal["week", "all"]
TOP_N = 50
ANONYMOUS = "Gracz"


def week_start(now: datetime) -> datetime:
    monday = (now - timedelta(days=now.weekday())).date()
    return datetime(monday.year, monday.month, monday.day, tzinfo=UTC)


def key_for(scope: Scope, now: datetime) -> str:
    if scope == "all":
        return "lb:all"
    year, week, _ = now.isocalendar()
    return f"lb:week:{year}-{week:02d}"


async def _ensure(session: AsyncSession, redis: Redis, scope: Scope, now: datetime) -> str:
    key = key_for(scope, now)
    if await redis.exists(key):
        return key
    since = week_start(now) if scope == "week" else None
    totals = await repo.xp_totals(session, since)
    if totals:
        await redis.zadd(key, {str(user_id): float(xp) for user_id, xp in totals})
    else:
        # Mark as built so an empty board isn't recomputed on every request.
        await redis.zadd(key, {"__built__": 0})
    return key


async def leaderboard(
    session: AsyncSession, redis: Redis, user: User, scope: Scope
) -> LeaderboardOut:
    now = datetime.now(UTC)
    key = await _ensure(session, redis, scope, now)
    raw = await redis.zrevrange(key, 0, TOP_N, withscores=True)
    top = [(uuid.UUID(m), int(score)) for m, score in raw if m != "__built__"][:TOP_N]
    names = {
        u.id: u.nickname or ANONYMOUS for u in await users.get_users(session, (m for m, _ in top))
    }
    items = [
        LeaderboardEntry(rank=i + 1, nickname=names.get(uid, ANONYMOUS), xp=xp)
        for i, (uid, xp) in enumerate(top)
    ]
    my_rank = await redis.zrevrank(key, str(user.id))
    my_xp = await redis.zscore(key, str(user.id))
    me = LeaderboardEntry(
        rank=(my_rank + 1) if my_rank is not None and my_xp else None,
        nickname=user.nickname or ANONYMOUS,
        xp=int(my_xp or 0),
    )
    return LeaderboardOut(items=items, me=me)
