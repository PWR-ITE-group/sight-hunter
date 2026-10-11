# api

FastAPI modular monolith. Owner: backend (A).

Code lives in `app/modules/<module>/` (`auth`, `quests`, `finds`, `wallet`, `media`, `social`, `shop`, `admin`); each module keeps its own `models.py`, `schemas.py`, `repository.py` (all queries, plain async functions over the session), `service.py` (rules, transactions, errors) and `router.py`. Routers call services only; a module reaches another module through its service. Shared pieces are in `app/core/` (settings, DB, errors, JWT, Redis/arq, S3 storage, idempotency, rate limit).

## Run locally

```bash
cp ../.env.example ../.env          # once; set passwords, S3 keys, JWT_SECRET
docker compose -f ../docker-compose.yml up -d postgres redis seaweedfs seaweedfs-init
poetry install                      # creates api/.venv
poetry run alembic upgrade head
poetry run python -m app.seed       # two test places, tasks, placeholder reels
poetry run uvicorn app.main:app --reload --port 8000   # Swagger at /docs
poetry run arq app.worker.WorkerSettings               # applies verdicts, awards rewards
```

Or everything in containers: `docker compose up -d --build` from the repo root (migrations run on API start; run the seed with `docker compose exec api python -m app.seed`). The `worker` service is the ML worker; its first build is slow (torch + DINOv2 weights).

Real content (8 places of the demo route, reference photos) is loaded from `worker/` into the same database: `python -m app.cli.seed_dev` (places/tasks from `content/places.yaml`, upsert by `places.slug`) then `python -m app.cli.add_refs` (embeddings into `place_refs`). See `worker/README.md`.

Checks: `poetry run ruff check .`, `poetry run mypy app`, `poetry run pytest` (needs the Postgres and Redis from compose; tests use a separate `<POSTGRES_DB>_test` database and Redis db 9).

## Settings that matter for the demo

- `DEMO_MODE=true` — the API accepts the position the client sends (long tap on the map).
- `VERIFY_STUB=true` — no ML worker needed: every submitted photo is accepted. The full loop works on stubs. Set it to `false` once the `worker` service runs and reference photos are loaded; without refs every photo is `not_matched`.
- `S3_PUBLIC_ENDPOINT` — address of the storage the **phone** can reach (laptop IP or tunnel); presigned upload URLs are signed for it.

## Queue contract with the ML worker (`worker/`, role C)

The API never awards points inside the worker; the worker only answers "is this the place?".

| Direction | Queue | Job | Arguments |
| --- | --- | --- | --- |
| API → worker | `arq:queue:ml` | `verify_attempt` | `attempt_id: str`, `photo_key: str` (key in bucket `S3_BUCKET`), `place_id: str` (place the player is looking for) |
| worker → API | `arq:queue:api` | `apply_verdict` | `attempt_id: str`, `verdict: "accepted" \| "rejected"`, `score: float \| None`, `matched_place_id: str \| None` (best-matching place; a different one means "wrong place") |

Enqueue the verdict with `_job_id=f"verdict:{attempt_id}"` so a retried job cannot produce two verdicts. The API worker (`app/worker.py`) then runs the reward transaction, updates the leaderboard and deletes the photo (NFT-06). Reference embeddings go to `place_refs` (`embedding vector(768)`, HNSW cosine index).

## Status

Done (all under `/api/v1`, see Swagger at `/docs`):
- auth: register/login/refresh (rotating), password-reset stub, `/me`, nickname; rate limits
- quests: `/places/nearby` with offset zones, `/places/next` (nearest / popular / random), `/tasks/{id}`, rounds, hints (points only)
- finds: attempts with geofence + GPS slack, presigned upload, submit (idempotent), polling; `app.worker` applies verdicts and pays rewards in one transaction, then leaderboard + photo deletion
- wallet: ledgers, `/leaderboard` (Redis, rebuilt from `xp_ledger` when missing)
- media/social: `/reels/feed` (with `finders_count`), views, comments (10/min), share link. No likes (team decision 2026-10-11)
- shop: public reels for points, `SELECT … FOR UPDATE` on the player, Idempotency-Key
- admin: SQLAdmin at `/admin` (places with WKT input, tasks, reels, read-only players/finds)

Not built: daily mini-game (first to cut in the work plan).
