import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from geoalchemy2.elements import WKBElement
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, str_enum


class AttemptStatus(enum.StrEnum):
    AWAITING_UPLOAD = "awaiting_upload"
    QUEUED = "queued"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    round_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("task_rounds.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    photo_key: Mapped[str | None] = mapped_column(String(255))
    # Cleared together with the photo once the round is over (NFT-06).
    gps: Mapped[WKBElement | None] = mapped_column(
        Geography("POINT", srid=4326, spatial_index=False)
    )
    accuracy_m: Mapped[float | None] = mapped_column(Float)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[AttemptStatus] = mapped_column(
        str_enum(AttemptStatus, "attempt_status"),
        default=AttemptStatus.AWAITING_UPLOAD,
    )
    reason: Mapped[str | None] = mapped_column(String(20))  # wrong_place | not_matched
    matched_place_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("places.id", ondelete="SET NULL")
    )
    score: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verdict_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Find(Base):
    """A counted discovery. (user_id, task_id) is unique, so a reward can be paid only once."""

    __tablename__ = "finds"
    __table_args__ = (UniqueConstraint("user_id", "task_id", name="uq_finds_user_task"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("attempts.id", ondelete="SET NULL")
    )
    points_awarded: Mapped[int] = mapped_column(Integer)
    xp_awarded: Mapped[int] = mapped_column(Integer)
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
