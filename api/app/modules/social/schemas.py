import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CommentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    id: uuid.UUID
    author_nickname: str
    text: str
    created_at: datetime


class CommentsOut(BaseModel):
    items: list[CommentOut]
    next_cursor: str | None


class ShareLinkOut(BaseModel):
    url: str
