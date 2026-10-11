import uuid
from datetime import date, datetime, timezone

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.auth.models import User
from app.modules.daily import repository as repo
from app.modules.daily.schemas import (
    AnswerItem,
    DailyGameOut,
    DailyGameResult,
    DailyGameResultCorrect,
    DailyQuestionOut,
    StartGameOut,
)
from app.modules.wallet import service as wallet
from app.modules.wallet.models import LedgerReason

POINTS_PER_CORRECT_ANSWER = 10


async def get_daily_game(session: AsyncSession, user: User, target_date: date | None = None) -> DailyGameOut:
    today = target_date or datetime.now(timezone.utc).date()
    questions = await repo.get_questions_for_date(session, today)
    game = await repo.get_daily_game(session, user.id, today)

    played = game is not None and game.finished_at is not None
    result: DailyGameResult | None = None
    if played and game is not None:
        correct_items = [
            DailyGameResultCorrect(question_id=q.id, option_index=q.correct_option)
            for q in questions
        ]
        result = DailyGameResult(
            score=game.score or 0,
            points_awarded=game.points_awarded if game.points_awarded is not None else (game.score or 0) * POINTS_PER_CORRECT_ANSWER,
            correct=correct_items,
        )

    q_outs = [
        DailyQuestionOut(
            id=q.id,
            text=q.text,
            image_url=q.image_url,
            options=q.options,
        )
        for q in questions
    ]
    return DailyGameOut(
        date=today,
        played=played,
        questions=q_outs,
        result=result,
    )


async def start_daily_game(session: AsyncSession, user: User) -> StartGameOut:
    today = datetime.now(timezone.utc).date()
    game = await repo.get_daily_game(session, user.id, today)
    if game is not None and game.finished_at is not None:
        raise AppError("already_played", status.HTTP_409_CONFLICT)

    if game is None:
        game = await repo.create_or_get_started_game(session, user.id, today)
        await session.commit()

    return StartGameOut(started_at=game.started_at)


async def submit_answers(
    session: AsyncSession, user: User, answers: list[AnswerItem]
) -> DailyGameResult:
    today = datetime.now(timezone.utc).date()
    game = await repo.get_daily_game(session, user.id, today)
    if game is not None and game.finished_at is not None:
        raise AppError("already_played", status.HTTP_409_CONFLICT)

    if game is None:
        game = await repo.create_or_get_started_game(session, user.id, today)

    q_ids = [a.question_id for a in answers]
    questions = await repo.get_questions_by_ids(session, q_ids)
    q_map = {q.id: q for q in questions}

    score = 0
    correct_list: list[DailyGameResultCorrect] = []
    for a in answers:
        q = q_map.get(a.question_id)
        if q is not None:
            correct_list.append(
                DailyGameResultCorrect(question_id=q.id, option_index=q.correct_option)
            )
            if a.option_index == q.correct_option:
                score += 1

    points = score * POINTS_PER_CORRECT_ANSWER
    game.finished_at = datetime.now(timezone.utc)
    game.score = score
    game.points_awarded = points

    if points > 0:
        ref_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"daily:{user.id}:{today}")
        wallet.add_points(session, user.id, points, LedgerReason.DAILY, ref_id)

    await session.commit()
    return DailyGameResult(
        score=score,
        points_awarded=points,
        correct=correct_list,
    )
