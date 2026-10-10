import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.quests.models import RoundStatus

NextMode = Literal["nearest", "popular", "random"]


class Zone(BaseModel):
    lat: float
    lng: float
    radius_m: int


class PlaceMarker(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    found: bool
    name: str | None
    zone: Zone


class NearbyOut(BaseModel):
    items: list[PlaceMarker]


class NextPlaceOut(PlaceMarker):
    distance_m: int


class TaskOut(BaseModel):
    id: uuid.UUID
    place_id: uuid.UUID
    riddle: str
    archival_photo_url: str | None
    hints_total: int = Field(le=3)
    reward_points: int
    reward_xp: int


class RoundOut(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    status: RoundStatus
    hints_used: int
    hints: list[str]
    reward_points: int
    attempts_left: int
    started_at: datetime


class HintOut(BaseModel):
    hint_text: str
    hints_used: int = Field(ge=1, le=3)
    reward_points: int
