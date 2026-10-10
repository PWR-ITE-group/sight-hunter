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

Rules: `app/decision.py`. Pipeline: `app/tasks.py`. After the verdict the player photo is
deleted (NFT-06) and, if accepted, `RewardHook.on_accepted(attempt_id)` is called.

## Contract with the API (A)

- Enqueue: `await redis.enqueue_job("verify_attempt", str(attempt_id), _job_id=f"verify:{attempt_id}")`
  after setting `attempts.status = 'queued'`. The job skips attempts that are not `queued`.
- Tables and columns the worker uses: `dev/schema.sql`. The worker writes `attempts.status`,
  `score`, `reason`, `matched_place_id`, `judge`, `verified_at`. `wrong_place_name` for the API
  response is `places.name` of `matched_place_id`.
- `place_refs` needs the HNSW index (`vector_cosine_ops`) and `places.slug`.
- Reward: the worker does not touch `finds` or ledgers. A's idempotent reward function is
  plugged in as `RewardHook` (`app/reward.py`); until then accepted attempts get no reward.

## Content tools

Run from `worker/`; data lives in `content/`.

| Command | What it does |
| --- | --- |
| `python -m app.cli.fetch_places [--refs 40]` | Wikipedia → Wikidata → OSM: QID, coordinates, Commons category into `places.yaml`; downloads Commons photo candidates (CC/PD only, author recorded) |
| `python -m app.cli.pick_refs [--top 8]` | Ranks candidates by similarity to the Wikidata main image and copies the best to `refs/<slug>/` for manual review |
| `python -m app.cli.seed_dev` | DEV ONLY: `dev/schema.sql` + places and tasks from `places.yaml` |
| `python -m app.cli.add_refs [slug ...]` | Embeds `refs/<slug>/*.jpg` into `place_refs` and copies them to storage |
| `python -m app.cli.identify photo.jpg [--target slug]` | Top places for a photo and the verdict, same code as the worker |
| `python -m app.cli.fetch_tests [slug ...] [--n 15]` | Downloads CC test photos from Openverse (Flickr etc., no Wikimedia) into `content/test-photos/<slug>/` and `_none/` for manual review |
| `python -m app.cli.calibrate [--model clip:ViT-B-32]` | Picks thresholds on `content/test-photos/`, writes `content/calibration/report-*.md` |

## Docker

`docker build -t lowcy-worker worker` bakes the model weights into the image. The compose
service is added together with the API (owner A).
