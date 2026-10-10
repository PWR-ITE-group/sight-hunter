"""Shared helpers for the content CLIs: places.yaml and the refs/<slug>/ folders."""

import hashlib
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTENT = REPO_ROOT / "content"
PLACES_FILE = CONTENT / "places.yaml"
REFS_DIR = CONTENT / "refs"
TESTS_DIR = CONTENT / "test-photos"
SOURCES_FILE = "sources.yaml"
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
HEADER = (
    "# Places of the demo route. Source of truth for places, tasks and hints (Polish).\n"
    "# Hand-written: slug, name, wiki_pl, radius_m, era, category, task, hints, rewards.\n"
    "# Filled by `python -m app.cli.fetch_places` (from worker/): wikidata, lat, lng, osm,"
    " commons_category.\n"
    "# Texts come from the UI prototype (NotForGithub/Łowcy Historii.html).\n\n"
)


def load_places(path: Path = PLACES_FILE) -> dict[str, Any]:
    data: dict[str, Any] = yaml.safe_load(path.read_text(encoding="utf-8"))
    defaults = data.get("defaults", {})
    for p in data["places"]:
        for k, v in defaults.items():
            p.setdefault(k, v)
    return data


def save_places(data: dict[str, Any], path: Path = PLACES_FILE) -> None:
    defaults = data.get("defaults", {})
    places = [
        {k: v for k, v in p.items() if not (k in defaults and v == defaults[k])}
        for p in data["places"]
    ]
    body = yaml.safe_dump({"defaults": defaults, "places": places}, allow_unicode=True,
                          sort_keys=False, width=100)
    path.write_text(HEADER + body, encoding="utf-8", newline="\n")


def image_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXT)


def load_sources(folder: Path) -> dict[str, dict[str, str]]:
    """refs/<slug>/sources.yaml: file name -> {source_url, author, license}."""
    f = folder / SOURCES_FILE
    if not f.exists():
        return {}
    return yaml.safe_load(f.read_text(encoding="utf-8")) or {}


def save_sources(folder: Path, sources: dict[str, dict[str, str]]) -> None:
    (folder / SOURCES_FILE).write_text(
        yaml.safe_dump(sources, allow_unicode=True, sort_keys=True, width=100),
        encoding="utf-8", newline="\n",
    )


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
