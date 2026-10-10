import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, str_enum


class ReelKind(enum.StrEnum):
    REWARD = "reward"
    PUBLIC = "public"


class Reel(Base):
    __tablename__ = "reels"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    place_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("places.id", ondelete="SET NULL"), index=True
    )
    kind: Mapped[ReelKind] = mapped_column(str_enum(ReelKind, "reel_kind", length=10))
    title: Mapped[str] = mapped_column(String(200))
    # Provider + URL instead of a hard-coded path, so R2/Stream/Bunny can be swapped.
    video_provider: Mapped[str] = mapped_column(String(30), default="r2")
    playback_url: Mapped[str] = mapped_column(String(500))
    duration_s: Mapped[float] = mapped_column(Float, default=0)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # Public reels with a price are sold in the shop; null = free for everyone.
    price_points: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UnlockSource(enum.StrEnum):
    FIND = "find"
    PURCHASE = "purchase"


class ReelUnlock(Base):
    __tablename__ = "reel_unlocks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    reel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reels.id", ondelete="CASCADE"), primary_key=True
    )
    source: Mapped[UnlockSource] = mapped_column(str_enum(UnlockSource, "unlock_source", length=10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
