from uuid import NAMESPACE_URL, uuid5

from app.cli.calibrate import NONE, Case, choose, simulate

SLUGS = ["katedra", "piasek", "ratusz"]


def case(truth: str, **scores: float) -> Case:
    full = {s: 0.2 for s in SLUGS} | scores
    return Case(f"{truth}/x.jpg", truth, full)


def test_choose_gives_zero_false_accepts_and_keeps_positives() -> None:
    cases = [
        case("katedra", katedra=0.82, piasek=0.55),
        case("katedra", katedra=0.74, piasek=0.60),
        case("piasek", piasek=0.78, katedra=0.62),
        case("ratusz", ratusz=0.80),
        case(NONE, ratusz=0.58, katedra=0.40),  # plain kamienica that looks a bit like ratusz
    ]
    th, _ = choose(cases, SLUGS)
    assert th.t_low <= th.t_single <= th.t_high
    ids = {s: uuid5(NAMESPACE_URL, s) for s in SLUGS}
    r = simulate(cases, SLUGS, th, ids)
    assert r["fp"] == []
    assert len(r["tp"]) == 4


def test_choose_reports_unreachable_positive() -> None:
    cases = [
        case("katedra", katedra=0.50),
        case(NONE, katedra=0.70),
    ]
    th, notes = choose(cases, SLUGS)
    assert th.t_single > 0.70
    assert notes
