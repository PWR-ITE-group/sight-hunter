from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.seed import seed


async def test_enum_columns_store_values_not_member_names(session: AsyncSession) -> None:
    """Content scripts and SQLAdmin see the raw column: it must hold 'reward', not 'REWARD'."""
    await seed(session)
    kinds = set(await session.scalars(text("SELECT DISTINCT kind FROM reels")))
    assert kinds == {"reward", "public"}
