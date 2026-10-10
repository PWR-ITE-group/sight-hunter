# api

FastAPI modular monolith. Owner: backend (A).

Code goes into `app/modules/<module>/` (`auth`, `quests`, `finds`, `wallet`, `media`, `social`, `shop`, `admin`). Each module keeps its own models, schemas and routes.

```bash
poetry install           # creates api/.venv
```

Lint, types and tests are configured in `pyproject.toml` (ruff, mypy strict, pytest) and run once there is code: `poetry run ruff check .`, `poetry run mypy app`, `poetry run pytest`.

No application code yet. Not done: Dockerfile, Alembic setup, compose service.
