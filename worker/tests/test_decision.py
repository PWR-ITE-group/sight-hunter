from uuid import uuid4

import pytest

from app.decision import PlaceScore, Reason, Status, assess, resolve_gray
from app.settings import Thresholds

TH = Thresholds(t_low=0.45, t_high=0.70, margin=0.05, t_single=0.60)
TARGET = uuid4()
OTHER = uuid4()
ELZBIETA = "Kościół św. Elżbiety"


def scores(target: float, other: float | None) -> tuple[list[PlaceScore], PlaceScore]:
    t = PlaceScore(TARGET, "Ratusz", target)
    items = [t] + ([PlaceScore(OTHER, ELZBIETA, other)] if other is not None else [])
    return items, t


@pytest.mark.parametrize(
    ("target", "other", "status", "reason"),
    [
        (0.85, 0.40, Status.ACCEPTED, None),  # clear match
        (0.85, None, Status.ACCEPTED, None),  # only place in the base
        (0.30, 0.35, Status.REJECTED, Reason.NOT_MATCHED),  # nothing matches
        (0.50, 0.82, Status.REJECTED, Reason.WRONG_PLACE),  # another monument
        (0.20, 0.71, Status.REJECTED, Reason.WRONG_PLACE),
    ],
)
def test_clear_cases(target: float, other: float | None, status: Status,
                     reason: Reason | None) -> None:
    items, t = scores(target, other)
    a = assess(items, t, TH)
    assert a.verdict is not None
    assert a.verdict.status is status
    assert a.verdict.reason is reason


def test_wrong_place_reports_name_and_id() -> None:
    items, t = scores(0.5, 0.9)
    v = assess(items, t, TH).verdict
    assert v is not None
    assert v.matched_place_id == OTHER
    assert v.wrong_place_name == ELZBIETA


@pytest.mark.parametrize(
    ("target", "other"),
    [
        (0.55, 0.30),  # between thresholds
        (0.75, 0.72),  # above t_high but margin too small
        (0.72, 0.74),  # other is higher but not by margin
    ],
)
def test_gray_zone(target: float, other: float) -> None:
    items, t = scores(target, other)
    assert assess(items, t, TH).gray


@pytest.mark.parametrize(
    ("target", "other", "status"),
    [
        (0.65, 0.30, Status.ACCEPTED),  # >= t_single and best
        (0.55, 0.30, Status.REJECTED),  # < t_single
        (0.72, 0.74, Status.REJECTED),  # not the best place
    ],
)
def test_gray_without_judge_uses_single_threshold(target: float, other: float,
                                                   status: Status) -> None:
    items, t = scores(target, other)
    v = resolve_gray(assess(items, t, TH), TH, None, "llm")
    assert v.status is status
    assert v.judge == "none"


@pytest.mark.parametrize("judge_says", [True, False])
def test_gray_with_judge_follows_judge(judge_says: bool) -> None:
    items, t = scores(0.50, 0.30)
    v = resolve_gray(assess(items, t, TH), TH, judge_says, "llm")
    assert v.status is (Status.ACCEPTED if judge_says else Status.REJECTED)
    assert v.judge == "llm"


def test_thresholds_must_be_ordered() -> None:
    with pytest.raises(ValueError):
        Thresholds(t_low=0.8, t_high=0.7, margin=0.05, t_single=0.75)

