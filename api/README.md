# api

FastAPI modular monolith. Owner: backend (A).

Code lives in `app/modules/<module>/` (`auth`, `quests`, `finds`, `wallet`, `media`, `social`, `shop`, `admin`); each module keeps its own `models.py`, `schemas.py`, `service.py`, `router.py`. Shared pieces are in `app/core/` (settings, DB, errors, JWT, Redis/arq, S3 storage, idempotency, rate limit).

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

Or everything in containers: `docker compose up -d --build` from the repo root (migrations run on API start; run the seed with `docker compose exec api python -m app.seed`).

Checks: `poetry run ruff check .`, `poetry run mypy app`, `poetry run pytest` (needs the Postgres and Redis from compose; tests use a separate `<POSTGRES_DB>_test` database and Redis db 9).

## Settings that matter for the demo

- `DEMO_MODE=true` — the API accepts the position the client sends (long tap on the map).
- `VERIFY_STUB=true` — no ML worker needed: every submitted photo is accepted. The full loop works on stubs.
- `S3_PUBLIC_ENDPOINT` — address of the storage the **phone** can reach (laptop IP or tunnel); presigned upload URLs are signed for it.

## Queue contract with the ML worker (`worker/`, role C)

The API never awards points inside the worker; the worker only answers "is this the place?".

| Direction | Queue | Job | Arguments |
| --- | --- | --- | --- |
| API → worker | `ml` | `verify_attempt` | `attempt_id: str`, `photo_key: str` (key in bucket `S3_BUCKET`), `place_id: str` (place the player is looking for) |
| worker → API | `api` | `apply_verdict` | `attempt_id: str`, `verdict: "accepted" \| "rejected"`, `score: float \| None`, `matched_place_id: str \| None` (best-matching place; a different one means "wrong place") |

Enqueue the verdict with `_job_id=f"verdict:{attempt_id}"` so a retried job cannot produce two verdicts. The API worker (`app/worker.py`) then runs the reward transaction, updates the leaderboard and deletes the photo (NFT-06). Reference embeddings go to `place_refs` (`embedding vector(768)`, HNSW cosine index).

## Status

Done: schema (Alembic), settings, error format, JWT/argon2 helpers, S3 storage (presigned PUT verified against SeaweedFS), idempotency and rate-limit helpers, test harness, seed.
Next: auth → quests → attempts and rewards → leaderboard, shop, reels, social, SQLAdmin.
