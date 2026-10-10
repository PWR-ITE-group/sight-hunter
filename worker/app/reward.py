"""Hand-off to the reward logic, which belongs to the API (owner A).

The worker only writes the verdict. After an `accepted` verdict is committed it calls
`RewardHook.on_accepted`; A's implementation must be idempotent (finds is unique on
user_id + task_id). Until it is agreed, the noop hook just logs.
"""

import logging
from typing import Protocol
from uuid import UUID

log = logging.getLogger(__name__)


class RewardHook(Protocol):
    async def on_accepted(self, attempt_id: UUID) -> None: ...


class NoopRewardHook:
    async def on_accepted(self, attempt_id: UUID) -> None:
        log.info("reward hook not configured; attempt %s accepted without reward", attempt_id)
