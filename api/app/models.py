"""Imports every model so `Base.metadata` is complete for Alembic and tests."""

from app.core.db import Base
from app.core.models import IdempotencyKey
from app.modules.auth.models import RefreshToken, User
from app.modules.finds.models import Attempt, Find
from app.modules.media.models import Reel, ReelUnlock
from app.modules.quests.models import Place, PlaceRef, Task, TaskRound
from app.modules.shop.models import DailyGame, Purchase
from app.modules.social.models import ReelComment, ReelLike, ReelView
from app.modules.wallet.models import WalletLedger, XpLedger

__all__ = [
    "Attempt",
    "Base",
    "DailyGame",
    "Find",
    "IdempotencyKey",
    "Place",
    "PlaceRef",
    "Purchase",
    "Reel",
    "ReelComment",
    "ReelLike",
    "ReelUnlock",
    "ReelView",
    "RefreshToken",
    "Task",
    "TaskRound",
    "User",
    "WalletLedger",
    "XpLedger",
]
