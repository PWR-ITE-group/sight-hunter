"""Second opinion for the gray zone between thresholds.

Providers register under a name and are selected with JUDGE_PROVIDER. The default "none"
returns no opinion, so the gray zone falls back to a single threshold (Thresholds.t_single).
Adding a real LLM judge = one class with `compare` + one line in `_REGISTRY`; the pipeline
does not change.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from app.settings import Settings

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class JudgeRequest:
    photo: bytes
    references: list[bytes]
    place_name: str


class Judge(Protocol):
    name: str
    enabled: bool

    async def compare(self, req: JudgeRequest) -> bool | None:
        """True: same object, False: different, None: no opinion (error, timeout, disabled)."""
        ...


class NoneJudge:
    name = "none"
    enabled = False

    async def compare(self, req: JudgeRequest) -> bool | None:
        return None


_REGISTRY: dict[str, Callable[[Settings], Judge]] = {
    "none": lambda _s: NoneJudge(),
}


def build_judge(settings: Settings) -> Judge:
    factory = _REGISTRY.get(settings.judge_provider)
    if factory is None:
        log.warning("unknown JUDGE_PROVIDER=%r, using 'none'", settings.judge_provider)
        return NoneJudge()
    return factory(settings)
