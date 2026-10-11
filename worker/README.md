# worker

Photo verification worker. Owner: ML (C).

Takes `verify_attempt` jobs from Redis (arq), embeds the player photo with DINOv2, finds the
nearest reference photos in pgvector across all places, and decides with two thresholds. An
LLM judge for the gray zone is pluggable and off by default.

```bash
poetry install                  # creates worker/.venv (CPU torch)
poetry run arq app.main.WorkerSettings
poetry run pytest; poetry run ruff check .; poetry run mypy app
```

Settings come from env or `worker/.env` (see `app/settings.py`): `DATABASE_URL`, `REDIS_URL`,
`STORAGE_BACKEND` (`local` until S3 exists, then `s3` + `S3_*`), `MODEL_NAME`,
`JUDGE_PROVIDER`, thresholds `VERIFY_T_LOW`, `VERIFY_T_HIGH`, `VERIFY_MARGIN`,
`VERIFY_T_SINGLE`.

## Verdict

For the player's task place T: `s_T` is the best similarity to T's refs, `s_O` the best
similarity to any other place's refs.

| Condition | Result |
| --- | --- |
| `s_O >= T_HIGH` and `s_O >= s_T + MARGIN` | `rejected`, `wrong_place` + that place |
| `s_T >= T_HIGH` and `s_T - s_O >= MARGIN` | `accepted` |
| `s_T < T_LOW` | `rejected`, `not_matched` |
| otherwise (gray zone) | judge; without one: `accepted` if `s_T >= T_SINGLE` and T is the best place |

Rules: `app/decision.py`. Pipeline: `app/tasks.py`. The verdict is handed to the API as a job
(`app/verdicts.py`); the worker never writes `attempts`.

## Contract with the API (A)

- The API enqueues `verify_attempt(attempt_id, photo_key, place_id)` on `arq:queue:ml`
  (`ARQ_QUEUE`) with `_job_id=f"verify:{attempt_id}"` after setting `attempts.status = 'queued'`.
  The job reads the attempt row (`photo_key`, the round's task and place), skips attempts that
  are not `queued`, and locks the row while the photo is verified.
- The verdict goes back as `apply_verdict(attempt_id, "accepted" | "rejected", score,
  matched_place_id)` on `arq:queue:api` (`API_QUEUE`), `_job_id=f"verdict:{attempt_id}"`.
  The API (`api/app/worker.py`) sets status, `reason` (`wrong_place` when `matched_place_id`
  is another place, else `not_matched`), pays the reward, unlocks the reel and deletes the
  player photo (NFT-06), so `DELETE_PHOTO_AFTER_VERDICT` stays off here.
- Tables come from `api/alembic`; `dev/schema.sql` mirrors the columns the worker and the
  content CLIs read: `places.slug`, `place_refs` (`photo_url`, `source_url`, `author`,
  `license`, `sha256`, `model`, `embedding vector(768)`, unique `(place_id, sha256)`, HNSW
  `vector_cosine_ops`).
- Loading content into the API's database, from `worker/` with the API's `DATABASE_URL`:
  `python -m app.cli.seed_dev` (places and tasks from `content/places.yaml`; the dev schema is
  skipped when Alembic owns the database) then `python -m app.cli.add_refs`.

## Content tools

Run from `worker/`; data lives in `content/`.

| Command | What it does |
| --- | --- |
| `python -m app.cli.fetch_places [--refs 40]` | Wikipedia → Wikidata → OSM: QID, coordinates, Commons category into `places.yaml`; downloads Commons photo candidates (CC/PD only, author recorded) |
| `python -m app.cli.pick_refs [--top 8]` | Ranks candidates by similarity to the Wikidata main image and copies the best to `refs/<slug>/` for manual review |
| `python -m app.cli.seed_dev` | Places and tasks from `places.yaml` into the API's database (upsert by slug); on an empty DB without the API applies `dev/schema.sql` first |
| `python -m app.cli.add_refs [slug ...]` | Embeds `refs/<slug>/*.jpg` into `place_refs` and copies them to storage |
| `python -m app.cli.identify photo.jpg [--target slug]` | Top places for a photo and the verdict, same code as the worker |
| `python -m app.cli.fetch_tests [slug ...] [--n 15]` | Downloads CC test photos from Openverse (Flickr etc., no Wikimedia) into `content/test-photos/<slug>/` and `_none/` for manual review |
| `python -m app.cli.calibrate [--model clip:ViT-B-32]` | Picks thresholds on `content/test-photos/`, writes `content/calibration/report-*.md` |

## Docker

`docker build -t lowcy-worker worker` bakes the model weights into the image. In the repo's
`docker-compose.yml` this is the `worker` service (same Postgres, Redis and S3 as the API);
the first build downloads CPU torch and DINOv2 (~1.5 GB).
