import enum
import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from geoalchemy2.elements import WKBElement
from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

EMBEDDING_DIM = 768


class Place(Base):
    __tablename__ = "places"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    era: Mapped[str | None] = mapped_column(String(60))
    category: Mapped[str | None] = mapped_column(String(60))
    geom: Mapped[WKBElement] = mapped_column(Geography("POINT", srid=4326, spatial_index=True))
    radius_m: Mapped[int] = mapped_column(Integer, default=40)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlaceRef(Base):
    """Reference photo embedding; filled by content/add_refs (role C), searched by the ML worker."""

    __tablename__ = "place_refs"
    __table_args__ = (
        Index(
            "ix_place_refs_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    place_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"), index=True
    )
    photo_url: Mapped[str] = mapped_column(String(500))
    author: Mapped[str | None] = mapped_column(String(200))
    embedding: Mapped[Any] = mapped_column(Vector(EMBEDDING_DIM))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    place_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"), index=True
    )
    riddle: Mapped[str] = mapped_column(Text)
    archival_photo_url: Mapped[str | None] = mapped_column(String(500))
    hints: Mapped[list[str]] = mapped_column(JSONB, default=list)
    base_reward_points: Mapped[int] = mapped_column(Integer, default=40)
    base_xp: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RoundStatus(enum.StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TaskRound(Base):
    __tablename__ = "task_rounds"
    __table_args__ = (
        Index(
            "ix_task_rounds_one_active",
            "user_id",
            "task_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[RoundStatus] = mapped_column(
        Enum(RoundStatus, name="round_status", native_enum=False, length=20),
        default=RoundStatus.ACTIVE,
    )
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    # Hints lower this, never the player's balance. XP is not reduced (team decision).
    reward_points: Mapped[int] = mapped_column(Integer)
    reward_xp: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
