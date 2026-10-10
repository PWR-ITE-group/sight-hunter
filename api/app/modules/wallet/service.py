import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.wallet.models import LedgerReason, WalletLedger, XpLedger


async def points_balance(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(WalletLedger.delta), 0)).where(
            WalletLedger.user_id == user_id
        )
    )
    return int(total or 0)


async def xp_balance(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(XpLedger.delta), 0)).where(XpLedger.user_id == user_id)
    )
    return int(total or 0)


async def balances(session: AsyncSession, user_id: uuid.UUID) -> tuple[int, int]:
    return await points_balance(session, user_id), await xp_balance(session, user_id)


def add_points(
    session: AsyncSession,
    user_id: uuid.UUID,
    delta: int,
    reason: LedgerReason,
    ref_id: uuid.UUID | None,
) -> WalletLedger:
    """Appends a ledger row inside the caller's transaction. Never updates a balance column."""
    row = WalletLedger(user_id=user_id, delta=delta, reason=reason, ref_id=ref_id)
    session.add(row)
    return row


def add_xp(
    session: AsyncSession,
    user_id: uuid.UUID,
    delta: int,
    reason: LedgerReason,
    ref_id: uuid.UUID | None,
) -> XpLedger:
    row = XpLedger(user_id=user_id, delta=delta, reason=reason, ref_id=ref_id)
    session.add(row)
    return row
