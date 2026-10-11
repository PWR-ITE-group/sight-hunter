"""Fill places.yaml from open data and download reference photo candidates.

    python -m app.cli.fetch_places                 # coordinates: Wikipedia -> Wikidata -> OSM
    python -m app.cli.fetch_places --refs 15       # + up to 15 Commons photos per place
    python -m app.cli.fetch_places --only ratusz --refs 15

Only the place name in Polish Wikipedia is hand-written; the rest comes from Wikidata (QID,
coordinates, Commons category) and OpenStreetMap (building centre). That is what makes the
game portable to another city. Commons photos land in refs/<slug>/candidates/ with author and
license in sources.yaml: review them by hand and move good exterior shots one level up.
"""

import argparse
import html
import re
import time
from pathlib import Path
from typing import Any

import httpx

from app.cli.common import (
    REFS_DIR,
    image_files,
    load_places,
    load_sources,
    save_places,
    save_sources,
)

UA = "LowcyHistorii/0.1 (BEST Hacks 2026 hackathon; https://github.com/PWR-ITE-group/sight-hunter)"
WIKI_PL = "https://pl.wikipedia.org/w/api.php"
WIKIDATA = "https://www.wikidata.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
OVERPASS = ("https://overpass-api.de/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter")
OK_LICENSES = re.compile(r"^(cc0|cc[ -]by(-sa)?( \d\.\d)?|public domain|pd)", re.I)


def qid_for(client: httpx.Client, title: str) -> str | None:
    r = client.get(WIKI_PL, params={"action": "query", "prop": "pageprops", "titles": title,
                                    "redirects": 1, "format": "json"})
    for page in r.json()["query"]["pages"].values():
        qid = page.get("pageprops", {}).get("wikibase_item")
        if qid:
            return str(qid)
    return None


def wikidata(client: httpx.Client, qid: str) -> dict[str, Any]:
    r = client.get(WIKIDATA, params={"action": "wbgetentities", "ids": qid, "props": "claims",
                                     "format": "json"})
    claims = r.json()["entities"][qid]["claims"]

    def first(prop: str) -> Any:
        try:
            return claims[prop][0]["mainsnak"]["datavalue"]["value"]
        except (KeyError, IndexError):
            return None

    coord, cat, image = first("P625"), first("P373"), first("P18")
    out: dict[str, Any] = {"commons_category": cat, "commons_image": image}
    if coord:
        out["lat"], out["lng"] = round(coord["latitude"], 6), round(coord["longitude"], 6)
    return out


def osm_center(client: httpx.Client, qid: str) -> dict[str, Any] | None:
    query = f'[out:json][timeout:25];nwr["wikidata"="{qid}"];out center 1;'
    for url in OVERPASS:
        try:
            r = client.post(url, data={"data": query}, timeout=40)
            r.raise_for_status()
            elements = r.json().get("elements", [])
            break
        except (httpx.HTTPError, ValueError) as e:
            print(f"    overpass {url} failed: {type(e).__name__}")
    else:
        return None
    for el in elements:
        c = el.get("center") or el
        if "lat" in c:
            return {"osm": f"{el['type']}/{el['id']}", "lat": round(c["lat"], 6),
                    "lng": round(c["lon"], 6)}
    return None


def _plain(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


ANCHOR = "commons_p18.jpg"  # the Wikidata main image, used by pick_refs as the reference view


def _category_titles(client: httpx.Client, category: str, cmtype: str) -> list[str]:
    r = client.get(COMMONS, params={
        "action": "query", "list": "categorymembers", "cmtitle": f"Category:{category}",
        "cmtype": cmtype, "cmlimit": 200, "format": "json"})
    return [m["title"] for m in r.json()["query"]["categorymembers"]]


def commons_files(client: httpx.Client, category: str | None, image: str | None,
                  limit: int) -> list[dict[str, str]]:
    """Wikidata image first, then files of the category and its "exterior" subcategories."""
    p18 = f"File:{image}".replace("_", " ") if image else None
    titles: list[str] = [p18] if p18 else []
    if category:
        for sub in _category_titles(client, category, "subcat"):
            if re.search(r"exterior|fa[cç]ade|tower|views?\b", sub, re.I):
                titles += _category_titles(client, sub.removeprefix("Category:"), "file")
        titles += _category_titles(client, category, "file")
    titles = list(dict.fromkeys(titles))

    by_title: dict[str, dict[str, str]] = {}
    for i in range(0, len(titles), 50):
        r = client.get(COMMONS, params={
            "action": "query", "titles": "|".join(titles[i:i + 50]), "prop": "imageinfo",
            "iiprop": "url|mime|extmetadata", "iiurlwidth": 1024, "format": "json"})
        for page in r.json()["query"].get("pages", {}).values():
            info = (page.get("imageinfo") or [None])[0]
            if not info or info.get("mime") != "image/jpeg":
                continue
            meta = info.get("extmetadata", {})
            lic = _plain(meta.get("LicenseShortName", {}).get("value", ""))
            if not OK_LICENSES.match(lic):
                continue
            by_title[page["title"]] = {
                "title": page["title"],
                "url": info.get("thumburl") or info["url"],
                "source_url": info["descriptionurl"],
                "author": _plain(meta.get("Artist", {}).get("value", "unknown"))[:200],
                "license": lic,
                "anchor": "1" if page["title"] == p18 else "",
            }
    return [by_title[t] for t in titles if t in by_title][:limit]


def _free_name(folder: Path) -> str:
    i = len(image_files(folder)) + 1
    while (folder / f"commons_{i:02d}.jpg").exists():
        i += 1
    return f"commons_{i:02d}.jpg"


def download_refs(client: httpx.Client, slug: str, files: list[dict[str, str]]) -> int:
    folder = REFS_DIR / slug / "candidates"
    folder.mkdir(parents=True, exist_ok=True)
    sources = load_sources(folder)
    known = {v["source_url"] for v in sources.values()}
    n = 0
    for f in files:
        if f["source_url"] in known:
            continue
        name = ANCHOR if f["anchor"] else _free_name(folder)
        r = client.get(f["url"])
        if r.status_code != 200:
            continue
        (folder / name).write_bytes(r.content)
        sources[name] = {k: f[k] for k in ("source_url", "author", "license")}
        n += 1
        time.sleep(0.2)  # be polite to Wikimedia
    save_sources(folder, sources)
    return n


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--only", nargs="*", help="slugs to process (default: all)")
    ap.add_argument("--refs", type=int, default=0, help="download up to N Commons photos")
    ap.add_argument("--no-osm", action="store_true", help="skip Overpass, use Wikidata coords")
    args = ap.parse_args()

    data = load_places()
    with httpx.Client(headers={"User-Agent": UA}, timeout=30, follow_redirects=True) as client:
        for p in data["places"]:
            if args.only and p["slug"] not in args.only:
                continue
            print(f"{p['slug']}: {p['wiki_pl']}")
            qid = p.get("wikidata") or qid_for(client, p["wiki_pl"])
            if not qid:
                print("    no Wikidata item found, check wiki_pl")
                continue
            p["wikidata"] = qid
            wd = wikidata(client, qid)
            # Wikidata coordinates are a fallback; OSM building centre wins once known.
            if not p.get("osm"):
                p.update({k: v for k, v in wd.items() if k in ("lat", "lng") and v is not None})
            if wd["commons_category"]:
                p["commons_category"] = wd["commons_category"]
            if not args.no_osm and (osm := osm_center(client, qid)):
                p.update(osm)
            print(f"    {qid} {p.get('lat')},{p.get('lng')} osm={p.get('osm')} "
                  f"commons={p.get('commons_category')}")
            if args.refs:
                files = commons_files(client, wd["commons_category"], wd["commons_image"],
                                      args.refs)
                print(f"    downloaded {download_refs(client, p['slug'], files)} candidates")
    save_places(data)
    print("places.yaml updated")


if __name__ == "__main__":
    main()
