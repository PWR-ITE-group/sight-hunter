import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.finds.models import AttemptStatus


class AttemptRequest(BaseModel):
    lat: float
    lng: float
    accuracy_m: float
    taken_at: datetime
    mocked: bool


class AttemptCreated(BaseModel):
    attempt_id: uuid.UUID
    upload_url: str
    upload_expires_at: datetime


class AttemptOut(BaseModel):
    id: uuid.UUID
    status: AttemptStatus
    reason: Literal["wrong_place", "not_matched"] | None = None
    wrong_place_name: str | None = None
    points_awarded: int | None = None
    xp_awarded: int | None = None
    reel_id: uuid.UUID | None = None
    attempts_left: int | None = None
