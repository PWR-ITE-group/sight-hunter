import uuid

from pydantic import BaseModel

from app.modules.media.models import ReelKind


class ReelOut(BaseModel):
    id: uuid.UUID
    place_id: uuid.UUID | None
    kind: ReelKind
    title: str
    locked: bool
    playback_url: str | None
    duration_s: float
    finders_count: int
    likes_count: int
    liked_by_me: bool
    price_points: int | None


class FeedOut(BaseModel):
    items: list[ReelOut]
    next_cursor: str | None
