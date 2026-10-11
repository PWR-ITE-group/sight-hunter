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

from sqlalchemy import select

from app.core.db import get_engine, get_sessionmaker
from app.models import Place, QuizQuestion, Reel, Task
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

class RewardReelSeed(TypedDict):
    slug: str
    title: str
    playback_url: str
    duration_s: float


# Reward reels for places populated by fetch_places (not listed in PLACES above).
REWARD_REELS: list[RewardReelSeed] = [
    {
        "slug": "opera",
        "title": "Opera Wrocławska — kulisy sceny",
        "playback_url": "/storage/reels/opera.mp4",
        "duration_s": 30,
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


class QuizQuestionSeed(TypedDict):
    id: str
    text: str
    options: list[str]
    correct_option: int
    explanation: str
    day_order: int


QUIZ_QUESTIONS: list[QuizQuestionSeed] = [
    # Zestaw 0
    {
        "id": "q_hala_stulecia",
        "text": "W którym roku wybudowano Halę Stulecia projektu Maxa Berga?",
        "options": ["1911–1913", "1920–1922", "1899–1901", "1935–1937"],
        "correct_option": 0,
        "explanation": "Hala Stulecia powstała w latach 1911–1913 z okazji stulecia bitwy pod Lipskiem.",
        "day_order": 0,
    },
    {
        "id": "q_ostrow_tumski",
        "text": "Na jakiej wyspie stoi najstarsza wrocławska archikatedra św. Jana Chrzciciela?",
        "options": ["Wyspa Słodowa", "Ostrów Tumski", "Wyspa Piasek", "Kępa Mieszczańska"],
        "correct_option": 1,
        "explanation": "Ostrów Tumski to dawna wyspa na Odrze i najstarsza, zabytkowa część Wrocławia.",
        "day_order": 0,
    },
    {
        "id": "q_ratusz_piwnica",
        "text": "Jak nazywa się jedna z najstarszych restauracji w Europie, w piwnicy wrocławskiego Ratusza?",
        "options": ["Piwnica Świdnicka", "Karczma Lwowska", "Restauracja Spiż", "Pod Złotym Psem"],
        "correct_option": 0,
        "explanation": "Piwnica Świdnicka działała od końca XIII wieku jako jedna z najstarszych piwiarni w Europie.",
        "day_order": 0,
    },
    # Zestaw 1
    {
        "id": "q_most_tumski",
        "text": "Z czego przez lata słynął Most Tumski, zanim podczas renowacji zdjęto z niego metalowe ozdoby?",
        "options": ["Z kłódek zakochanych", "Z drewnianej nawierzchni", "Z zabytkowych tramwajów konnych", "Ze złoconych lwów"],
        "correct_option": 0,
        "explanation": "Zakochani przypinali na zielonym Moście Tumskim tysiące kłódek, wrzucając kluczyk do Odry.",
        "day_order": 1,
    },
    {
        "id": "q_jas_malgosia",
        "text": "Jak potocznie nazywają się dwie połączone arkadą kamieniczki obok bazyliki św. Elżbiety?",
        "options": ["Jaś i Małgosia", "Wars i Sawa", "Kajko i Kokosz", "Bolek i Lolek"],
        "correct_option": 0,
        "explanation": "Kamieniczki Jaś i Małgosia to dawne domy altarystów połączone barokową bramą z łukiem.",
        "day_order": 1,
    },
    {
        "id": "q_krasnale",
        "text": "Z jakim ruchem antykomunistycznym lat 80. związana jest geneza wrocławskich krasnali?",
        "options": ["Pomarańczowa Alternatywa", "Solidarność Walcząca", "Konfederacja Polski Niepodległej", "KOR"],
        "correct_option": 0,
        "explanation": "W latach 80. Pomarańczowa Alternatywa malowała krasnale na plamach po zamalowanych hasłach.",
        "day_order": 1,
    },
    # Zestaw 2
    {
        "id": "q_opera",
        "text": "W jakim stylu architektonicznym wzniesiono gmach Opery Wrocławskiej przy ul. Świdnickiej?",
        "options": ["Klasycystycznym", "Gotyckim", "Secesyjnym", "Barokowym"],
        "correct_option": 0,
        "explanation": "Gmach Opery Wrocławskiej zaprojektował Carl Ferdinand Langhans w stylu klasycystycznym.",
        "day_order": 2,
    },
    {
        "id": "q_aula_leopoldina",
        "text": "Jak nazywa się słynna, bogato zdobiona barokowa aula w gmachu Uniwersytetu Wrocławskiego?",
        "options": ["Aula Leopoldina", "Aula Kazimierzowska", "Aula Jagiellońska", "Aula Złota"],
        "correct_option": 0,
        "explanation": "Aula Leopoldina została wzniesiona na cześć cesarza Leopolda I Habsburga.",
        "day_order": 2,
    },
    {
        "id": "q_hala_targowa",
        "text": "Co było przełomowym rozwiązaniem inżynieryjnym w konstrukcji wrocławskiej Hali Targowej z 1908 r.?",
        "options": ["Żelbetowe łuki paraboliczne", "Szklana kopuła bez podpór", "Całkowicie drewniany szkielet", "Liny podwieszane"],
        "correct_option": 0,
        "explanation": "Żelbetowe łuki Hali Targowej były w tamtym czasie nowatorskim osiągnięciem architektury inżynieryjnej.",
        "day_order": 2,
    },
    # Zestaw 3
    {
        "id": "q_latarnik",
        "text": "W której części Wrocławia do dziś każdego wieczora latarnik ręcznie zapala gazowe latarnie?",
        "options": ["Na Ostrowie Tumskim", "W Rynku", "Na Promenadzie Staromiejskiej", "W Parku Szczytnickim"],
        "correct_option": 0,
        "explanation": "Na Ostrowie Tumskim do dziś zachowało się ponad 100 zabytkowych latarń gazowych.",
        "day_order": 3,
    },
    {
        "id": "q_most_grunwaldzki",
        "text": "Jak pierwotnie nazywał się wiszący Most Grunwaldzki, otwarty w 1910 roku?",
        "options": ["Kaiserbrücke (Most Cesarski)", "Breslauer Brücke", "Königsbrücke", "Oderbrücke"],
        "correct_option": 0,
        "explanation": "Most Grunwaldzki został otwarty w obecności cesarza Wilhelma II jako Kaiserbrücke.",
        "day_order": 3,
    },
    {
        "id": "q_piasek_kosciol",
        "text": "Na której wrocławskiej wyspie wznosi się gotycki kościół Najświętszej Marii Panny?",
        "options": ["Wyspa Piasek", "Wyspa Młyńska", "Wyspa Słodowa", "Wyspa Bielarska"],
        "correct_option": 0,
        "explanation": "Kościół NMP na Piasku znajduje się na wyspie Piasek, połączonej z miastem Mostem Piaskowym.",
        "day_order": 3,
    },
]


async def seed(session: AsyncSession) -> None:
    for p in PLACES:
        place = await session.scalar(select(Place).where(Place.slug == p["key"]))
        place_id = place.id if place else sid(f"place:{p['key']}")
        if place is None:
            place = Place(
                id=place_id,
                slug=p["key"],
                name=p["name"],
                era=p["era"],
                category=p["category"],
                geom=WKTElement(f"POINT({p['lng']} {p['lat']})", srid=4326),
                radius_m=p["radius_m"],
            )
            session.add(place)
            await session.flush()

        task = await session.scalar(select(Task).where(Task.place_id == place_id))
        if task is None:
            session.add(
                Task(
                    id=sid(f"task:{p['key']}"),
                    place_id=place_id,
                    riddle=p["riddle"],
                    hints=p["hints"],
                    base_reward_points=40,
                    base_xp=100,
                )
            )

        existing_reel = await session.scalar(
            select(Reel).where(Reel.place_id == place_id, Reel.kind == ReelKind.REWARD)
        )
        if existing_reel is None:
            session.add(
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
    # Reward reels for places already in DB (from fetch_places / content pipeline).
    for rr in REWARD_REELS:
        place = await session.scalar(select(Place).where(Place.slug == rr["slug"]))
        if place is None:
            print(f"  skip reward reel for {rr['slug']}: place not found")
            continue
        await session.merge(
            Reel(
                id=sid(f"reel:{rr['slug']}"),
                place_id=place.id,
                kind=ReelKind.REWARD,
                title=rr["title"],
                video_provider="local",
                playback_url=rr["playback_url"],
                duration_s=rr["duration_s"],
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
    for q in QUIZ_QUESTIONS:
        await session.merge(
            QuizQuestion(
                id=q["id"],
                text=q["text"],
                options=q["options"],
                correct_option=q["correct_option"],
                explanation=q["explanation"],
                day_order=q["day_order"],
            )
        )
    await session.commit()


async def main() -> None:
    async with get_sessionmaker()() as session:
        await seed(session)
    await get_engine().dispose()
    print(
        f"seeded {len(PLACES)} places, {len(PLACES)} tasks, "
        f"{len(PLACES) + len(REWARD_REELS) + len(PUBLIC_REELS)} reels, "
        f"{len(QUIZ_QUESTIONS)} quiz questions"
    )


if __name__ == "__main__":
    asyncio.run(main())
