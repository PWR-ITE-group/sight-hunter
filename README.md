# Łowcy Historii (sight-hunter)

Location-based game about the history of Wrocław, built for BEST Hacks 2026. A player gets a riddle or an archival photo, finds the place, photographs it, and unlocks a short video about its history.

## Repository layout

| Path | What it is |
| --- | --- |
| `api/` | FastAPI modular monolith (Poetry) |
| `worker/` | Photo-recognition worker on arq + Redis |
| `mobile/` | Expo + TypeScript app |
| `content/` | Scripts that build places, reference photos and reels |
| `openapi/openapi.yaml` | API contract (draft, agreed by the team) |
| `docker/`, `docker-compose.yml` | Local infrastructure |

## Local infrastructure

```bash
cp .env.example .env      # set a password; change ports if 5432/6379 are taken
docker compose up -d --build
```

Starts PostgreSQL 17 with PostGIS and pgvector, Redis, the API (`:8000`), its verdict worker and the ML worker.

Photos are plain files in `.storage/` (gitignored), mounted into `api`, `api-worker` and `worker`. There is no S3: the phone PUTs the photo to the `upload_url` it gets from the API, which points back at the API itself (`PUT /api/v1/uploads/{token}`).

See the README in each folder for details.
