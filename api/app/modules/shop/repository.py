from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shop.models import Purchase


def add_purchase(session: AsyncSession, purchase: Purchase) -> Purchase:
    session.add(purchase)
    return purchase
