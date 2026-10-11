# Recognition worker. CPU-only torch; DINOv2 weights are baked in so startup needs no network.
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    HF_HOME=/opt/hf

WORKDIR /app

RUN pip install --no-cache-dir "poetry>=2.1,<3"
COPY pyproject.toml poetry.lock poetry.toml ./
RUN poetry install --only main --no-root && rm -rf /root/.cache

ARG MODEL_NAME=facebook/dinov2-base
RUN .venv/bin/python -c "from transformers import AutoImageProcessor, AutoModel; \
AutoImageProcessor.from_pretrained('${MODEL_NAME}'); AutoModel.from_pretrained('${MODEL_NAME}')"

COPY app ./app
COPY dev ./dev

ENV PATH="/app/.venv/bin:$PATH" \
    HF_HUB_OFFLINE=1 \
    MODEL_NAME=${MODEL_NAME}

CMD ["arq", "app.main.WorkerSettings"]
