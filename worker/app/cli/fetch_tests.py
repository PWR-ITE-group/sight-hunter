"""Download candidate test photos from Openverse (Flickr etc., CC licenses) for calibration.

    python -m app.cli.fetch_tests                 # all places + _none
    python -m app.cli.fetch_tests most _none --n 20
    python -m app.cli.fetch_tests elzbieta --refs --n 25   # extra refs to review

Saves to content/test-photos/<slug>/ov_<id>.jpg with sources.yaml. Wikimedia is excluded so
test photos never overlap the refs (those come from Commons). Results are noisy: review the
folders by hand and delete interiors, details and photos of something else.
test-photos/ is git-ignored, so NC/ND licenses are fine for this local use.
"""

import argparse
import time
from typing import Any

import httpx

from app.cli.common import (
    REFS_DIR,
    TESTS_DIR,
    image_files,
    load_places,
    load_sources,
    save_sources,
    sha256,
)
from app.cli.fetch_places import UA

OPENVERSE = "https://api.openverse.org/v1/images/"
NONE = "_none"
REVIEW = "review"
# Refs are committed to the repo, so only licenses that allow redistribution and derivatives.
FREE_LICENSES = "by,by-sa,cc0,pdm"
QUERIES: dict[str, list[str]] = {
    "ratusz": ["Ratusz Wrocław", "Wroclaw town hall", "Breslau Rathaus"],
    "elzbieta": ["Kościół św. Elżbiety Wrocław", "St. Elizabeth church Wroclaw",
                 "Elisabethkirche Breslau"],
    "piasek": ["Kościół NMP na Piasku", "Church of Our Lady on the Sand Wroclaw",
               "Sandkirche Breslau"],
    "katedra": ["Katedra Wrocław Ostrów Tumski", "Wroclaw cathedral",
                "Archikatedra św. Jana Chrzciciela"],
    "uniwersytet": ["Uniwersytet Wrocławski gmach główny", "University of Wroclaw building",
                    "Universität Breslau"],
    "most": ["Most Tumski", "Tumski bridge Wroclaw", "Dombrücke Breslau"],
    "hala": ["Hala Targowa Wrocław", "Market hall Wroclaw", "Markthalle Breslau"],
    "opera": ["Opera Wrocławska", "Wroclaw opera house", "Oper Breslau"],
    NONE: ["Wrocław kamienice", "Wroclaw street", "Wroclaw tenement houses",
           "Wrocław ulica", "Wroclaw old town houses", "Wroclaw building facade"],
}


def search(client: httpx.Client, q: str, pages: int = 2,
           free_only: bool = False) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for page in range(1, pages + 1):
        params: dict[str, Any] = {"q": q, "page_size": 20, "page": page,
                                  "excluded_source": "wikimedia"}
        if free_only:
            params["license"] = FREE_LICENSES
        r = client.get(OPENVERSE, params=params)
        if r.status_code == 429:
            print("  openverse rate limit, waiting 30 s")
            time.sleep(30)
            r = client.get(OPENVERSE, params=params)
        if r.status_code != 200:
            break
        data = r.json()
        out += data.get("results", [])
        if page >= data.get("page_count", 0):
            break
    return out


def _taken(slug: str) -> tuple[set[str], set[str]]:
    """Names and hashes already used as test photos or refs: never reuse them."""
    folders = [TESTS_DIR / slug, REFS_DIR / slug, REFS_DIR / slug / REVIEW]
    files = [f for d in folders for f in image_files(d)]
    return {f.name for f in files}, {sha256(f.read_bytes()) for f in files}


def fetch(client: httpx.Client, slug: str, n: int, for_refs: bool = False) -> int:
    folder = REFS_DIR / slug / REVIEW if for_refs else TESTS_DIR / slug
    folder.mkdir(parents=True, exist_ok=True)
    sources = load_sources(folder)
    names, seen = _taken(slug)
    added = 0
    hits: dict[str, dict[str, Any]] = {}
    for q in QUERIES[slug]:
        for h in search(client, q, pages=4 if for_refs else 2, free_only=for_refs):
            hits.setdefault(h["id"], h)
    for h in hits.values():
        if added >= n:
            break
        name = f"ov_{h['id'][:8]}.jpg"
        if name in sources or name in names or (h.get("width") or 0) < 500:
            continue
        try:
            r = client.get(h["url"])
            r.raise_for_status()
        except httpx.HTTPError:
            continue
        if not r.headers.get("content-type", "").startswith("image/jpeg"):
            continue
        digest = sha256(r.content)
        if digest in seen:
            continue
        seen.add(digest)
        (folder / name).write_bytes(r.content)
        lic = f"{h.get('license', '')} {h.get('license_version', '')}".strip()
        sources[name] = {"source_url": h.get("foreign_landing_url") or h["url"],
                         "author": h.get("creator") or "",
                         "license": lic,
                         "title": h.get("title") or ""}
        added += 1
    save_sources(folder, sources)
    return added


def main() -> None:
    slugs = [p["slug"] for p in load_places()["places"]] + [NONE]
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slugs", nargs="*", metavar="slug", help=f"any of {', '.join(slugs)}")
    ap.add_argument("--n", type=int, default=15, help="new photos per place (_none: x2)")
    ap.add_argument("--refs", action="store_true",
                    help=f"extra ref candidates into refs/<slug>/{REVIEW}/ (free licenses only)")
    args = ap.parse_args()
    if unknown := set(args.slugs) - set(slugs):
        ap.error(f"unknown slug(s): {', '.join(sorted(unknown))}")
    with httpx.Client(headers={"User-Agent": UA}, timeout=30, follow_redirects=True) as client:
        for slug in args.slugs or slugs:
            if slug not in QUERIES:
                print(f"{slug}: no queries, add them to QUERIES")
                continue
            n = args.n * 2 if slug == NONE else args.n
            print(f"{slug}: +{fetch(client, slug, n, for_refs=args.refs)}")


if __name__ == "__main__":
    main()
