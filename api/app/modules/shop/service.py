import uuid
from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, not_found
from app.core.idempotency import run_idempotent
from app.modules.auth import repository as users
from app.modules.auth.models import User
from app.modules.media import repository as reels
from app.modules.media.models import Reel, ReelUnlock, UnlockSource
from app.modules.shop import repository as repo
from app.modules.shop.models import Purchase
from app.modules.shop.schemas import PurchaseOut, ShopItem, ShopItemsOut
from app.modules.wallet import service as wallet
from app.modules.wallet.models import LedgerReason

# The shop sells public reels only (team decision: hints have no stock to buy).


def _reel_item(reel: Reel) -> ShopItem:
    assert reel.price_points is not None
    return ShopItem(
        id=str(reel.id),
        type="reel",
        name=reel.title,
        description="Rolka o historii Wrocławia",
        price_points=reel.price_points,
    )


async def list_items(session: AsyncSession, user: User) -> ShopItemsOut:
    points, _ = await wallet.balances(session, user.id)
    items = [_reel_item(r) for r in await reels.purchasable_reels(session, user.id)]
    return ShopItemsOut(balance=points, items=items)


async def purchase(
    session: AsyncSession, user: User, item_id: str, key: uuid.UUID
) -> tuple[int, dict[str, Any]]:
    async def op() -> tuple[int, dict[str, Any]]:
        try:
            reel_id = uuid.UUID(item_id)
        except ValueError:
            raise not_found("item") from None
        reel = await reels.get_reel(session, reel_id)
        if reel is None or reel.price_points is None or reel.kind != "public":
            raise not_found("item")
        if await reels.is_unlocked(session, user.id, reel.id):
            raise not_found("item")
        # Lock the player's row first: two quick purchases can't both pass the balance check.
        locked = await users.get_user_for_update(session, user.id)
        assert locked is not None
        points, _ = await wallet.balances(session, user.id)
        if points < reel.price_points:
            raise AppError(
                "insufficient_points",
                status.HTTP_409_CONFLICT,
                {"balance": points, "price_points": reel.price_points},
            )
        row = repo.add_purchase(
            session,
            Purchase(
                user_id=user.id,
                item_type="reel",
                item_id=str(reel.id),
                price_points=reel.price_points,
            ),
        )
        await session.flush()
        wallet.add_points(session, user.id, -reel.price_points, LedgerReason.PURCHASE, row.id)
        reels.add_unlock(
            session, ReelUnlock(user_id=user.id, reel_id=reel.id, source=UnlockSource.PURCHASE)
        )
        out = PurchaseOut(balance=points - reel.price_points, item=_reel_item(reel))
        return status.HTTP_201_CREATED, out.model_dump()

    return await run_idempotent(session, user.id, key, "purchase", op)
