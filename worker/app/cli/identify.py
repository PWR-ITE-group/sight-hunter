"""Which place is on this photo? Uses the same search and thresholds as the worker.

    python -m app.cli.identify photo.jpg                   # top places with similarity
    python -m app.cli.identify photo.jpg --target ratusz   # + the verdict for that task
"""

import argparse
import asyncio
from pathlib import Path
from uuid import UUID

from sqlalchemy import text

from app.db import create_engine
from app.decision import assess, resolve_gray
from app.embedder import build_embedder, load_image
from app.repository import SqlClaim
from app.settings import get_settings

NIL = UUID(int=0)


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("photos", nargs="+", type=Path)
    ap.add_argument("--target", help="place slug of the task")
    args = ap.parse_args()

    settings = get_settings()
    th = settings.thresholds
    embedder = build_embedder(settings.model_name, settings.model_device, settings.embed_flip_tta)
    engine = create_engine(settings.database_url)
    async with engine.connect() as conn:
        target_id, target_name = NIL, "-"
        if args.target:
            row = (await conn.execute(text("SELECT id, name FROM places WHERE slug = :s"),
                                      {"s": args.target})).first()
            if row is None:
                raise SystemExit(f"unknown place {args.target}")
            target_id, target_name = row
        for photo in args.photos:
            vec = embedder.embed(load_image(photo.read_bytes()))
            claim = SqlClaim(conn, NIL, str(photo), target_id, target_name)
            scores = await claim.place_scores(vec, settings.search_top_k)
            print(f"\n{photo.name}")
            for s in [s for s in scores if s.place_id != NIL][:5]:
                print(f"  {s.score:.3f}  {s.name}")
            if args.target:
                target = next(s for s in scores if s.place_id == target_id)
                a = assess(scores, target, th)
                v = a.verdict or resolve_gray(a, th, None)
                zone = " (gray zone)" if a.gray else ""
                name = f" -> {v.wrong_place_name}" if v.wrong_place_name else ""
                print(f"  verdict for {args.target}: {v.status.value}{zone} "
                      f"{v.reason.value if v.reason else ''}{name}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
