"""Load reference photos into place_refs (embedding + storage copy).

    python -m app.cli.add_refs                    # every content/refs/<slug>/ folder
    python -m app.cli.add_refs ratusz katedra     # selected places
    python -m app.cli.add_refs --replace ratusz   # drop the place's refs first (new model, cleanup)

Takes images directly in refs/<slug>/ (not candidates/). Same file twice is skipped (sha256).
Author and license come from refs/<slug>/sources.yaml; own photos without an entry are
recorded as author "team", license "own".
"""

import argparse
import asyncio

from sqlalchemy import text

from app.cli.common import REFS_DIR, image_files, load_sources, sha256
from app.db import create_engine
from app.embedder import build_embedder, load_image
from app.settings import get_settings
from app.storage import build_storage

# The API generates ids in Python (no column default), hence gen_random_uuid() here.
_INSERT = text("""
    INSERT INTO place_refs (id, place_id, photo_url, source_url, author, license, sha256, model,
                            embedding)
    VALUES (gen_random_uuid(), :pid, :key, :source_url, :author, :license, :sha, :model, :emb)
    ON CONFLICT (place_id, sha256) DO NOTHING
""")


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("slugs", nargs="*", help="places to load (default: all folders in refs/)")
    ap.add_argument("--replace", action="store_true", help="delete existing refs of the place")
    args = ap.parse_args()

    settings = get_settings()
    slugs = args.slugs or sorted(d.name for d in REFS_DIR.iterdir() if d.is_dir())
    embedder = build_embedder(settings.model_name, settings.model_device, settings.embed_flip_tta)
    storage = build_storage(settings)
    engine = create_engine(settings.database_url)

    async with engine.begin() as conn:
        for slug in slugs:
            folder = REFS_DIR / slug
            pid = await conn.scalar(text("SELECT id FROM places WHERE slug = :s"), {"s": slug})
            if pid is None:
                print(f"{slug}: no such place in the database, skipped")
                continue
            if args.replace:
                await conn.execute(text("DELETE FROM place_refs WHERE place_id = :p"), {"p": pid})
            other_models = await conn.scalar(text(
                "SELECT count(*) FROM place_refs WHERE place_id = :p AND model <> :m"),
                {"p": pid, "m": settings.model_name})
            if other_models:
                print(f"{slug}: {other_models} refs from another model, rerun with --replace")
            sources = load_sources(folder)
            added = 0
            for f in image_files(folder):
                data = f.read_bytes()
                sha = sha256(data)
                exists = await conn.scalar(text(
                    "SELECT 1 FROM place_refs WHERE place_id = :p AND sha256 = :s"),
                    {"p": pid, "s": sha})
                if exists:
                    continue
                vec = await asyncio.to_thread(embedder.embed, load_image(data))
                key = f"refs/{slug}/{sha[:16]}{f.suffix.lower()}"
                await storage.put(key, data)
                src = sources.get(f.name, {})
                await conn.execute(_INSERT, {
                    "pid": pid, "key": key, "source_url": src.get("source_url"),
                    "author": src.get("author", "team"), "license": src.get("license", "own"),
                    "sha": sha, "model": settings.model_name, "emb": vec})
                added += 1
            total = await conn.scalar(text("SELECT count(*) FROM place_refs WHERE place_id = :p"),
                                      {"p": pid})
            warn = "  <- need at least 5" if total < 5 else ""
            print(f"{slug}: +{added}, total {total}{warn}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
