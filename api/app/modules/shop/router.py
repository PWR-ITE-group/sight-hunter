from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, IdempotencyKeyDep, SessionDep
from app.modules.shop import service
from app.modules.shop.schemas import PurchaseOut, PurchaseRequest, ShopItemsOut

shop_router = APIRouter(prefix="/shop", tags=["shop"])


@shop_router.get("/items", response_model=ShopItemsOut)
async def list_shop_items(user: CurrentUser, session: SessionDep) -> ShopItemsOut:
    return await service.list_items(session, user)


@shop_router.post("/purchases", response_model=PurchaseOut, status_code=201)
async def purchase(
    body: PurchaseRequest,
    user: CurrentUser,
    session: SessionDep,
    idempotency_key: IdempotencyKeyDep,
) -> Any:
    code, out = await service.purchase(session, user, body.item_id, idempotency_key)
    return JSONResponse(out, status_code=code)
