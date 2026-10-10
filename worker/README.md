# worker

Photo verification worker: takes `verify_attempt` jobs from Redis (arq), embeds the photo (OpenCLIP or DINOv2), compares it with reference photos in pgvector, asks an LLM judge only in the gray zone. Owner: ML (C).

Not set up yet: Poetry project, dependencies, Dockerfile, compose service.
