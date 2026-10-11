"""DEV ONLY: create the minimal schema and load places + tasks from places.yaml.

    python -m app.cli.seed_dev            # apply worker/dev/schema.sql + upsert places/tasks

The real schema and seed belong to the API (A, Alembic). This exists so the worker and
add_refs can be tested locally before that is ready.
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import text

from app.cli.common import load_places
from app.db import create_engine
from app.settings import get_settings

SCHEMA = Path(__file__).resolve().parents[2] / "dev" / "schema.sql"

_UPSERT_PLACE = text("""
    INSERT INTO places (slug, name, era, category, geom, radius_m)
    VALUES (:slug, :name, :era, :category,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, era = EXCLUDED.era,
        category = EXCLUDED.category, geom = EXCLUDED.geom, radius_m = EXCLUDED.radius_m
    RETURNING id
""")


async def main() -> None:
    engine = create_engine(get_settings().database_url)
    async with engine.begin() as conn:
        raw = await conn.get_raw_connection()
        assert raw.driver_connection is not None
        await raw.driver_connection.execute(SCHEMA.read_text(encoding="utf-8"))
        for p in load_places()["places"]:
            if p.get("lat") is None:
                print(f"skip {p['slug']}: no coordinates, run fetch_places first")
                continue
            place_id = await conn.scalar(_UPSERT_PLACE, {
                "slug": p["slug"], "name": p["name"], "era": p.get("era"),
                "category": p.get("category"), "lat": p["lat"], "lng": p["lng"],
                "radius_m": p["radius_m"]})
            await conn.execute(text("DELETE FROM tasks WHERE place_id = :pid AND id NOT IN "
                                    "(SELECT task_id FROM task_rounds)"), {"pid": place_id})
            exists = await conn.scalar(text("SELECT id FROM tasks WHERE place_id = :pid"),
                                       {"pid": place_id})
            if exists is None:
                await conn.execute(text("""
                    INSERT INTO tasks (place_id, riddle, hints, base_reward_points, base_xp)
                    VALUES (:pid, :riddle, CAST(:hints AS jsonb), :pts, :xp)
                """), {"pid": place_id, "riddle": p["task"],
                       "hints": json.dumps(p["hints"], ensure_ascii=False),
                       "pts": p["base_reward_points"], "xp": p["base_xp"]})
            print(f"{p['slug']}: {place_id}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
