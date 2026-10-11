import uuid
from collections.abc import Sequence
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.daily.models import QuizQuestion
from app.modules.shop.models import DailyGame


async def get_questions_for_date(
    session: AsyncSession, game_date: date
) -> Sequence[QuizQuestion]:
    # Check max day_order to rotate sets
    max_order = await session.scalar(select(func.max(QuizQuestion.day_order)))
    if max_order is not None and max_order > 0:
        day_idx = game_date.toordinal() % (max_order + 1)
        questions = (
            await session.scalars(
                select(QuizQuestion)
                .where(QuizQuestion.day_order == day_idx)
                .order_by(QuizQuestion.id)
            )
        ).all()
        if questions:
            return questions

    # Fallback: return up to 5 questions
    return (
        await session.scalars(
            select(QuizQuestion).order_by(QuizQuestion.day_order, QuizQuestion.id).limit(5)
        )
    ).all()


async def get_questions_by_ids(
    session: AsyncSession, ids: Sequence[str]
) -> Sequence[QuizQuestion]:
    return (
        await session.scalars(
            select(QuizQuestion).where(QuizQuestion.id.in_(ids))
        )
    ).all()


async def get_daily_game(
    session: AsyncSession, user_id: uuid.UUID, game_date: date
) -> DailyGame | None:
    return await session.get(DailyGame, (user_id, game_date))


async def create_or_get_started_game(
    session: AsyncSession, user_id: uuid.UUID, game_date: date
) -> DailyGame:
    game = await session.get(DailyGame, (user_id, game_date))
    if game is None:
        game = DailyGame(
            user_id=user_id,
            date=game_date,
            started_at=datetime.now(timezone.utc),
        )
        session.add(game)
        await session.flush()
    return game
