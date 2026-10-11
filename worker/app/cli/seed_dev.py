"""Load places + tasks from places.yaml; DEV ONLY schema when the API's migrations aren't there.

    python -m app.cli.seed_dev            # upsert places/tasks (+ dev/schema.sql on an empty DB)

On a database migrated by the API (Alembic, `alembic_version` table) the schema step is skipped
and places are upserted by `slug` straight into the real tables; `add_refs` then fills
`place_refs`. The dev schema is only for testing the worker without the API.
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import text

from app.cli.common import load_places
from app.db import create_engine
from app.settings import get_settings

SCHEMA = Path(__file__).resolve().parents[2] / "dev" / "schema.sql"

# The API generates ids in Python (no column default), hence gen_random_uuid() here.
_UPSERT_PLACE = text("""
    INSERT INTO places (id, slug, name, era, category, geom, radius_m)
    VALUES (gen_random_uuid(), :slug, :name, :era, :category,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, era = EXCLUDED.era,
        category = EXCLUDED.category, geom = EXCLUDED.geom, radius_m = EXCLUDED.radius_m
    RETURNING id
""")


async def main() -> None:
    engine = create_engine(get_settings().database_url)
    async with engine.begin() as conn:
        migrated = await conn.scalar(text("SELECT to_regclass('alembic_version') IS NOT NULL"))
        if migrated:
            print("database is managed by the API's migrations, dev schema skipped")
        else:
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
                    INSERT INTO tasks (id, place_id, riddle, hints, base_reward_points, base_xp)
                    VALUES (gen_random_uuid(), :pid, :riddle, CAST(:hints AS jsonb), :pts, :xp)
                """), {"pid": place_id, "riddle": p["task"],
                       "hints": json.dumps(p["hints"], ensure_ascii=False),
                       "pts": p["base_reward_points"], "xp": p["base_xp"]})
            print(f"{p['slug']}: {place_id}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
