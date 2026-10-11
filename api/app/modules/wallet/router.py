from typing import Annotated

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, RedisDep, SessionDep
from app.modules.wallet import leaderboard
from app.modules.wallet.schemas import LeaderboardOut

leaderboard_router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@leaderboard_router.get("", response_model=LeaderboardOut)
async def get_leaderboard(
    user: CurrentUser,
    session: SessionDep,
    redis: RedisDep,
    scope: Annotated[leaderboard.Scope, Query()] = "week",
) -> LeaderboardOut:
    return await leaderboard.leaderboard(session, redis, user, scope)
