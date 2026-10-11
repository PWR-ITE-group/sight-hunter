"""Test content for development: two places, their tasks and placeholder reels.

Idempotent (fixed UUIDs, upsert), so it can be re-run after every schema change:
    poetry run python -m app.seed
Real places come from content/ scripts and SQLAdmin; this is only for running the loop locally.
"""

import asyncio
import uuid
from typing import NotRequired, TypedDict

from geoalchemy2.elements import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_engine, get_sessionmaker
from app.models import Place, Reel, Task
from app.modules.media.models import ReelKind

_NS = uuid.UUID("5a7d2d8e-0000-4000-8000-000000000001")


def sid(name: str) -> uuid.UUID:
    return uuid.uuid5(_NS, name)


# Sample MP4s published by Google for player testing; replaced by real reels in phase 2.
class PlaceSeed(TypedDict):
    key: str
    name: str
    era: str
    category: str
    lat: float
    lng: float
    radius_m: int
    riddle: str
    hints: list[str]
    reel_title: str
    video: str


class PublicReelSeed(TypedDict):
    key: str
    title: str
    video: str
    price_points: NotRequired[int]


_SAMPLE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/"

PLACES: list[PlaceSeed] = [
    {
        "key": "ratusz",
        "name": "Ratusz we Wrocławiu",
        "era": "XIII–XVI w.",
        "category": "architektura",
        "lat": 51.1100,
        "lng": 17.0318,
        "radius_m": 60,
        "riddle": "Znajdź gotycki budynek z wieżą i zegarem pośrodku rynku.",
        "hints": [
            "Stoi na środku dużego placu, otoczonego ogródkami kawiarni.",
            "Ma bogato zdobiony szczyt i astronomiczny zegar.",
            "To dawna siedziba władz miasta — dziś muzeum.",
        ],
        "reel_title": "Ratusz: 700 lat w centrum miasta",
        "video": "ForBiggerBlazes.mp4",
    },
    {
        "key": "katedra",
        "name": "Katedra św. Jana Chrzciciela",
        "era": "XIII–XIV w.",
        "category": "sakralne",
        "lat": 51.1143,
        "lng": 17.0464,
        "radius_m": 70,
        "riddle": "Znajdź kościół z dwiema wysokimi, ostrymi wieżami.",
        "hints": [
            "Szukaj na wyspie, na którą prowadzi most pełen kłódek.",
            "Wieczorem latarnik ręcznie zapala tu gazowe lampy.",
            "To najstarsza część miasta — Ostrów Tumski.",
        ],
        "reel_title": "Katedra na Ostrowie Tumskim",
        "video": "ForBiggerEscapes.mp4",
    },
]

PUBLIC_REELS: list[PublicReelSeed] = [
    {"key": "city", "title": "Wrocław w 40 sekund", "video": "ForBiggerJoyrides.mp4"},
    {
        "key": "krasnale",
        "title": "Skąd się wzięły krasnale?",
        "video": "ForBiggerMeltdowns.mp4",
        "price_points": 40,
    },
]


async def seed(session: AsyncSession) -> None:
    for p in PLACES:
        place_id = sid(f"place:{p['key']}")
        await session.merge(
            Place(
                id=place_id,
                slug=p["key"],
                name=p["name"],
                era=p["era"],
                category=p["category"],
                geom=WKTElement(f"POINT({p['lng']} {p['lat']})", srid=4326),
                radius_m=p["radius_m"],
            )
        )
        await session.merge(
            Task(
                id=sid(f"task:{p['key']}"),
                place_id=place_id,
                riddle=p["riddle"],
                hints=p["hints"],
                base_reward_points=40,
                base_xp=100,
            )
        )
        await session.merge(
            Reel(
                id=sid(f"reel:{p['key']}"),
                place_id=place_id,
                kind=ReelKind.REWARD,
                title=p["reel_title"],
                video_provider="sample",
                playback_url=_SAMPLE + p["video"],
                duration_s=15,
            )
        )
    for r in PUBLIC_REELS:
        await session.merge(
            Reel(
                id=sid(f"reel:{r['key']}"),
                kind=ReelKind.PUBLIC,
                title=r["title"],
                video_provider="sample",
                playback_url=_SAMPLE + r["video"],
                duration_s=15,
                price_points=r.get("price_points"),
            )
        )
    await session.commit()


async def main() -> None:
    async with get_sessionmaker()() as session:
        await seed(session)
    await get_engine().dispose()
    print(
        f"seeded {len(PLACES)} places, {len(PLACES)} tasks, {len(PLACES) + len(PUBLIC_REELS)} reels"
    )


if __name__ == "__main__":
    asyncio.run(main())
