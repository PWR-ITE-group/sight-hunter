from typing import Literal

from pydantic import BaseModel


class ShopItem(BaseModel):
    id: str
    type: Literal["hint", "reel", "partner"]
    name: str
    description: str
    price_points: int
    quantity: int | None = None


class ShopItemsOut(BaseModel):
    balance: int
    items: list[ShopItem]


class PurchaseRequest(BaseModel):
    item_id: str


class PurchaseOut(BaseModel):
    balance: int
    item: ShopItem
    coupon_code: str | None = None
