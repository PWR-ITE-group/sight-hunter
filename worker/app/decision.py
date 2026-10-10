"""Verdict rules. Pure functions: no DB, no model, easy to test and to explain to the jury."""

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.settings import Thresholds


class Status(StrEnum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Reason(StrEnum):
    WRONG_PLACE = "wrong_place"
    NOT_MATCHED = "not_matched"


@dataclass(frozen=True)
class PlaceScore:
    place_id: UUID
    name: str
    score: float


@dataclass(frozen=True)
class Verdict:
    status: Status
    score: float
    reason: Reason | None = None
    matched_place_id: UUID | None = None
    wrong_place_name: str | None = None
    judge: str = "none"


@dataclass(frozen=True)
class Assessment:
    """Result of the threshold stage: a final verdict, or a gray zone for the judge."""

    target: PlaceScore
    best_other: PlaceScore | None
    verdict: Verdict | None

    @property
    def gray(self) -> bool:
        return self.verdict is None


def assess(scores: list[PlaceScore], target: PlaceScore, th: Thresholds) -> Assessment:
    """`scores` holds the best similarity per place (any place); `target` is the task's place."""
    others = [s for s in scores if s.place_id != target.place_id]
    best_other = max(others, key=lambda s: s.score, default=None)
    s_t = target.score
    s_o = best_other.score if best_other else 0.0

    def done(v: Verdict) -> Assessment:
        return Assessment(target, best_other, v)

    if best_other and s_o >= th.t_high and s_o >= s_t + th.margin:
        return done(Verdict(Status.REJECTED, s_t, Reason.WRONG_PLACE,
                            best_other.place_id, best_other.name))
    if s_t >= th.t_high and s_t - s_o >= th.margin:
        return done(Verdict(Status.ACCEPTED, s_t, matched_place_id=target.place_id))
    if s_t < th.t_low:
        return done(Verdict(Status.REJECTED, s_t, Reason.NOT_MATCHED))
    return Assessment(target, best_other, None)


def resolve_gray(a: Assessment, th: Thresholds, judge_says: bool | None,
                 judge_name: str = "none") -> Verdict:
    """Final verdict for the gray zone. `judge_says=None` means no judge or it failed."""
    s_t = a.target.score
    if judge_says is None:
        s_o = a.best_other.score if a.best_other else 0.0
        ok = s_t >= th.t_single and s_t > s_o
        judge_name = "none"
    else:
        ok = judge_says
    if ok:
        return Verdict(Status.ACCEPTED, s_t, matched_place_id=a.target.place_id, judge=judge_name)
    return Verdict(Status.REJECTED, s_t, Reason.NOT_MATCHED, judge=judge_name)
