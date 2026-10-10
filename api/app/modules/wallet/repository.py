import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.wallet.models import WalletLedger, XpLedger


async def sum_points(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(WalletLedger.delta), 0)).where(
            WalletLedger.user_id == user_id
        )
    )
    return int(total or 0)


async def sum_xp(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(XpLedger.delta), 0)).where(XpLedger.user_id == user_id)
    )
    return int(total or 0)


def add_points_row(session: AsyncSession, row: WalletLedger) -> WalletLedger:
    session.add(row)
    return row


def add_xp_row(session: AsyncSession, row: XpLedger) -> XpLedger:
    session.add(row)
    return row
