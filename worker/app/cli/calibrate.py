"""Pick thresholds on our own test photos. No database needed.

    python -m app.cli.calibrate                         # DINOv2 (MODEL_NAME), writes a report
    python -m app.cli.calibrate --model clip:ViT-B-32   # compare with CLIP (needs extra "clip")

Inputs:
    content/refs/<slug>/*.jpg          reference photos (what goes into place_refs)
    content/test-photos/<slug>/*.jpg   own photos of the place (must be accepted)
    content/test-photos/_none/*.jpg    photos of no place: plain kamienice, streets (rejected)

Every test photo is checked against every place as the task target, like a player with that
task standing there. Positive = photo of X, task X. Negative = everything else. Thresholds
are chosen so that no negative is accepted, then as many positives as possible pass.
"""

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

import numpy as np

from app.cli.common import CONTENT, REFS_DIR, TESTS_DIR, image_files, sha256
from app.decision import PlaceScore, Reason, Status, assess, resolve_gray
from app.embedder import Embedder, build_embedder, load_image
from app.settings import Thresholds, get_settings

NONE = "_none"
GRID = np.round(np.arange(0.20, 0.99, 0.01), 2)
# Below this DINOv2 cosine a photo shares nothing useful with the refs.
T_LOW_FLOOR = 0.30


@dataclass
class Case:
    photo: str
    truth: str  # slug or NONE
    scores: dict[str, float]  # best similarity per place

    def pair(self, target: str) -> tuple[float, float, str]:
        s_t = self.scores[target]
        others = {k: v for k, v in self.scores.items() if k != target}
        best = max(others, key=lambda k: others[k], default="")
        return s_t, others.get(best, 0.0), best


def embed_folder(embedder: Embedder, folder: Path) -> tuple[list[Path], np.ndarray]:
    files = image_files(folder)
    vecs = [embedder.embed(load_image(f.read_bytes())) for f in files]
    return files, np.stack(vecs) if vecs else np.zeros((0, embedder.dim), np.float32)


def min_safe(values: list[float]) -> float:
    """Smallest grid threshold strictly above every negative value."""
    worst = max(values, default=0.0)
    return float(next((g for g in GRID if g > worst + 1e-9), GRID[-1]))


def choose(cases: list[Case], slugs: list[str]) -> tuple[Thresholds, list[str]]:
    pos = [c.pair(c.truth) for c in cases if c.truth != NONE]
    neg = [c.pair(t) for c in cases for t in slugs if t != c.truth]
    notes: list[str] = []

    # t_single: gray-zone rule without a judge = "s_t >= t and target is the best place".
    t_single = min_safe([s for s, o, _ in neg if s > o])

    # t_high + margin: auto-accept. Prefer the pair that accepts most positives, then bigger margin.
    best: tuple[int, float, float] | None = None
    for m in np.round(np.arange(0.0, 0.16, 0.01), 2):
        t = max(min_safe([s for s, o, _ in neg if s - o >= m]), t_single)
        n = sum(1 for s, o, _ in pos if s >= t and s - o >= m)
        if best is None or (n, m) > (best[0], best[2]):
            best = (n, float(t), float(m))
    assert best is not None
    _, t_high, margin = best

    # t_low: below it a photo is rejected outright; keep every positive above it.
    lowest_pos = min((s for s, _, _ in pos), default=t_single)
    t_low = float(min(np.floor((lowest_pos - 0.01) * 100) / 100, t_single))
    if t_low < T_LOW_FLOOR:
        t_low = min(T_LOW_FLOOR, t_single)
        notes.append(f"t_low clamped to {t_low:.2f}: own photos scoring lower are "
                     "most likely interiors/details, not the place itself")
    if lowest_pos < t_single:
        notes.append(f"lowest positive score {lowest_pos:.3f} is below t_single: "
                     "some own photos can't pass without a judge, add refs from those angles")
    return Thresholds(t_low=t_low, t_high=t_high, margin=margin, t_single=t_single), notes


def simulate(cases: list[Case], slugs: list[str], th: Thresholds,
             ids: dict[str, UUID]) -> dict[str, list[tuple[str, str, str]]]:
    """Run the worker's own decision code on every (photo, target) pair."""
    out: dict[str, list[tuple[str, str, str]]] = {k: [] for k in
                                                  ("tp", "fn", "fp", "tn", "wrong_ok")}
    for c in cases:
        for target in slugs:
            scores = [PlaceScore(ids[k], k, v) for k, v in c.scores.items()]
            t = next(s for s in scores if s.name == target)
            a = assess(scores, t, th)
            v = a.verdict or resolve_gray(a, th, None)
            row = (c.photo, target, f"{t.score:.3f}")
            if c.truth == target:
                out["tp" if v.status is Status.ACCEPTED else "fn"].append(row)
            elif v.status is Status.ACCEPTED:
                out["fp"].append(row)
            else:
                out["tn"].append(row)
                if v.reason is Reason.WRONG_PLACE and v.wrong_place_name == c.truth:
                    out["wrong_ok"].append(row)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--model", help="override MODEL_NAME, e.g. clip:ViT-B-32")
    ap.add_argument("--refs-dir", type=Path, default=REFS_DIR)
    ap.add_argument("--tests-dir", type=Path, default=TESTS_DIR)
    ap.add_argument("--out", type=Path, help="report path (default content/calibration/...)")
    args = ap.parse_args()
    refs_dir: Path = args.refs_dir
    tests_dir: Path = args.tests_dir

    settings = get_settings()
    model = args.model or settings.model_name
    embedder = build_embedder(model, settings.model_device, settings.embed_flip_tta)

    slugs = sorted(d.name for d in refs_dir.iterdir() if d.is_dir() and image_files(d))
    if not slugs:
        raise SystemExit(f"no reference photos in {refs_dir}/<slug>/")
    ref_vecs: dict[str, np.ndarray] = {}
    ref_hashes: set[str] = set()
    for slug in slugs:
        files, ref_vecs[slug] = embed_folder(embedder, refs_dir / slug)
        ref_hashes |= {sha256(f.read_bytes()) for f in files}
        print(f"refs {slug}: {len(files)}")

    cases: list[Case] = []
    test_folders = sorted(d for d in tests_dir.iterdir() if d.is_dir()) if tests_dir.is_dir() \
        else []
    for folder in test_folders:
        truth = folder.name
        if truth != NONE and truth not in slugs:
            print(f"test-photos/{truth}: no refs for this place, skipped")
            continue
        files, vecs = embed_folder(embedder, folder)
        for f, v in zip(files, vecs, strict=True):
            if sha256(f.read_bytes()) in ref_hashes:
                print(f"  {f.name} is also a reference photo, skipped (would inflate scores)")
                continue
            cases.append(Case(f"{truth}/{f.name}", truth,
                              {s: float((ref_vecs[s] @ v).max()) for s in slugs}))
        print(f"tests {truth}: {len(files)}")
    counts = Counter(c.truth for c in cases)
    if not any(k != NONE for k in counts):
        raise SystemExit(f"no own test photos in {tests_dir}/<slug>/")

    th, notes = choose(cases, slugs)
    ids = {s: uuid5(NAMESPACE_URL, s) for s in slugs}
    r = simulate(cases, slugs, th, ids)
    n_pos = len(r["tp"]) + len(r["fn"])
    n_neg = len(r["fp"]) + len(r["tn"])
    wrong_cases = sum(1 for c in cases if c.truth != NONE) * (len(slugs) - 1)

    lines = [
        f"# Calibration {datetime.now():%Y-%m-%d %H:%M} · model `{model}`", "",
        f"Places: {len(slugs)}, test photos: {dict(counts)}", "",
        "## Recommended thresholds (worker .env)", "", "```",
        f"VERIFY_T_LOW={th.t_low:.2f}", f"VERIFY_T_HIGH={th.t_high:.2f}",
        f"VERIFY_MARGIN={th.margin:.2f}", f"VERIFY_T_SINGLE={th.t_single:.2f}", "```", "",
        "## Result with these thresholds and no LLM judge", "",
        f"- own photos accepted: {len(r['tp'])}/{n_pos}",
        f"- false accepts: {len(r['fp'])}/{n_neg}",
        f"- photo of another monument named correctly (wrong_place): "
        f"{len(r['wrong_ok'])}/{wrong_cases}", "",
    ]
    lines += [f"> {n}" for n in notes]
    lines += ["", "## Scores per place (own photos, task = that place)", "",
              "| place | n | min | mean | hardest other place (max) |", "|---|---|---|---|---|"]
    for slug in slugs:
        mine = [c for c in cases if c.truth == slug]
        if not mine:
            continue
        own = [c.scores[slug] for c in mine]
        other = max(((o, b) for c in mine for _, o, b in [c.pair(slug)]), default=(0.0, "-"))
        lines.append(f"| {slug} | {len(own)} | {min(own):.3f} | {np.mean(own):.3f} | "
                     f"{other[1]} {other[0]:.3f} |")
    lines += ["", "## Missed own photos", ""] + [f"- {p} ({s})" for p, _, s in r["fn"]]
    hardest = sorted((c.pair(t)[0], c.photo, t) for c in cases for t in slugs if t != c.truth)
    lines += ["", "## Hardest negatives (photo, task, score)", ""]
    lines += [f"- {p} as {t}: {s:.3f}" for s, p, t in hardest[-10:][::-1]]

    report = "\n".join(lines) + "\n"
    name = f"report-{model.replace('/', '_').replace(':', '_')}.md"
    out = args.out or CONTENT / "calibration" / name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8", newline="\n")
    print("\n" + report + f"saved to {out}")


if __name__ == "__main__":
    main()
