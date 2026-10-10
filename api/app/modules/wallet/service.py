import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.wallet import repository as repo
from app.modules.wallet.models import LedgerReason, WalletLedger, XpLedger


async def balances(session: AsyncSession, user_id: uuid.UUID) -> tuple[int, int]:
    """(points, xp) — always computed from the ledgers, never stored."""
    return await repo.sum_points(session, user_id), await repo.sum_xp(session, user_id)


def add_points(
    session: AsyncSession,
    user_id: uuid.UUID,
    delta: int,
    reason: LedgerReason,
    ref_id: uuid.UUID | None,
) -> WalletLedger:
    """Appends a ledger row inside the caller's transaction."""
    return repo.add_points_row(
        session, WalletLedger(user_id=user_id, delta=delta, reason=reason, ref_id=ref_id)
    )


def add_xp(
    session: AsyncSession,
    user_id: uuid.UUID,
    delta: int,
    reason: LedgerReason,
    ref_id: uuid.UUID | None,
) -> XpLedger:
    return repo.add_xp_row(
        session, XpLedger(user_id=user_id, delta=delta, reason=reason, ref_id=ref_id)
    )
