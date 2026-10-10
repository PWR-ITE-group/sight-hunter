import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, str_enum


class LedgerReason(enum.StrEnum):
    FIND = "find"
    PURCHASE = "purchase"
    REFERRAL = "referral"
    DAILY = "daily"
    WELCOME = "welcome"


def _reason_column(name: str) -> Enum:
    return str_enum(LedgerReason, name)


class WalletLedger(Base):
    """Points, append-only. Balance = SUM(delta). One entry per (reason, ref_id)."""

    __tablename__ = "wallet_ledger"
    __table_args__ = (
        Index("ix_wallet_ledger_user", "user_id"),
        Index(
            "uq_wallet_ledger_ref",
            "user_id",
            "reason",
            "ref_id",
            unique=True,
            postgresql_where=text("ref_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[LedgerReason] = mapped_column(_reason_column("wallet_reason"))
    ref_id: Mapped[uuid.UUID | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class XpLedger(Base):
    """XP, append-only; leaderboard only. The Redis sorted set is rebuilt from this table."""

    __tablename__ = "xp_ledger"
    __table_args__ = (
        Index("ix_xp_ledger_user", "user_id"),
        Index(
            "uq_xp_ledger_ref",
            "user_id",
            "reason",
            "ref_id",
            unique=True,
            postgresql_where=text("ref_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[LedgerReason] = mapped_column(_reason_column("xp_reason"))
    ref_id: Mapped[uuid.UUID | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
