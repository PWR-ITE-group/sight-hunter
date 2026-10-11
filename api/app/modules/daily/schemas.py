from datetime import date, datetime

from pydantic import BaseModel, Field


class DailyQuestionOut(BaseModel):
    id: str
    text: str
    image_url: str | None = None
    options: list[str]


class DailyGameResultCorrect(BaseModel):
    question_id: str
    option_index: int


class DailyGameResult(BaseModel):
    score: int
    points_awarded: int
    correct: list[DailyGameResultCorrect]


class DailyGameOut(BaseModel):
    date: date
    played: bool
    questions: list[DailyQuestionOut]
    result: DailyGameResult | None = None


class StartGameOut(BaseModel):
    started_at: datetime


class AnswerItem(BaseModel):
    question_id: str
    option_index: int = Field(ge=0)


class SubmitAnswersIn(BaseModel):
    answers: list[AnswerItem]
