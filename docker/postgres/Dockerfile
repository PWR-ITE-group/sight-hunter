# No official image ships both PostGIS and pgvector, and postgis/postgis has no arm64 build.
# Start from the multi-arch official postgres image and add both from its PGDG apt repo.
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-17-postgis-3 \
        postgresql-17-pgvector \
    && rm -rf /var/lib/apt/lists/*

COPY init/ /docker-entrypoint-initdb.d/
