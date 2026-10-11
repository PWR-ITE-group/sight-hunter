from fastapi import APIRouter

from app.core.deps import CurrentUser, SessionDep
from app.modules.daily import service
from app.modules.daily.schemas import (
    DailyGameOut,
    DailyGameResult,
    StartGameOut,
    SubmitAnswersIn,
)

daily_router = APIRouter(prefix="/daily-game", tags=["daily-game"])


@daily_router.get("", response_model=DailyGameOut)
async def get_daily_game(user: CurrentUser, session: SessionDep) -> DailyGameOut:
    return await service.get_daily_game(session, user)


@daily_router.post("/start", response_model=StartGameOut)
async def start_daily_game(user: CurrentUser, session: SessionDep) -> StartGameOut:
    return await service.start_daily_game(session, user)


@daily_router.post("/answers", response_model=DailyGameResult)
async def submit_daily_answers(
    body: SubmitAnswersIn, user: CurrentUser, session: SessionDep
) -> DailyGameResult:
    return await service.submit_answers(session, user, body.answers)
