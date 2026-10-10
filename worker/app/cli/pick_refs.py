"""Pre-select reference photos from Commons candidates, for a human to review.

    python -m app.cli.pick_refs              # top 8 per place
    python -m app.cli.pick_refs --top 10 ratusz

Facade shots of one building look alike, while interiors, details (door handles, epitaphs)
and unrelated photos stand apart. Candidates are ranked by similarity to the Wikidata main
image (commons_p18.jpg, usually the facade); without it, by mean similarity to the other
candidates. The best ones are copied from refs/<slug>/candidates/ to
refs/<slug>/ with their sources.yaml entry. Then look through refs/<slug>/ and delete
anything that is not the outside of the building as a player would see it.
"""

import argparse
import shutil

import numpy as np

from app.cli.common import REFS_DIR, image_files, load_sources, save_sources
from app.cli.fetch_places import ANCHOR
from app.embedder import build_embedder, load_image
from app.settings import get_settings


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--top", type=int, default=8)
    args = ap.parse_args()

    settings = get_settings()
    embedder = build_embedder(settings.model_name, settings.model_device, settings.embed_flip_tta)
    slugs = args.slugs or sorted(d.name for d in REFS_DIR.iterdir() if d.is_dir())
    for slug in slugs:
        cand_dir = REFS_DIR / slug / "candidates"
        files = image_files(cand_dir)
        if len(files) < 3:
            print(f"{slug}: fewer than 3 candidates, skipped")
            continue
        vecs = np.stack([embedder.embed(load_image(f.read_bytes())) for f in files])
        names = [f.name for f in files]
        if ANCHOR in names:
            # Similarity to the Wikidata main image: a view of the building from outside.
            score = vecs @ vecs[names.index(ANCHOR)]
        else:
            sims = vecs @ vecs.T
            np.fill_diagonal(sims, np.nan)
            score = np.nanmean(sims, axis=1)
        order = np.argsort(-score)

        dest = REFS_DIR / slug
        cand_sources, sources = load_sources(cand_dir), load_sources(dest)
        print(f"\n{slug}")
        for rank, i in enumerate(order):
            f = files[i]
            picked = rank < args.top
            title = cand_sources.get(f.name, {}).get("source_url", "").rsplit("File:", 1)[-1]
            print(f"  {'+' if picked else ' '} {score[i]:.3f} {f.name} {title[:70]}")
            if picked and not (dest / f.name).exists():
                shutil.copy2(f, dest / f.name)
                if f.name in cand_sources:
                    sources[f.name] = cand_sources[f.name]
        save_sources(dest, sources)


if __name__ == "__main__":
    main()
