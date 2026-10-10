-- DEV ONLY. Minimal tables the worker reads and writes, for local testing before A's
-- Alembic migrations exist. This is the contract to agree with A: names and columns used
-- by worker/app/repository.py. Do not apply on top of real migrations.
--   docker compose exec -T postgres psql -U lowcy -d lowcy < worker/dev/schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS places (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name        text NOT NULL,
    era         text,
    category    text,
    geom        geography(Point, 4326) NOT NULL,
    radius_m    integer NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS tasks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id            uuid NOT NULL REFERENCES places(id),
    riddle              text NOT NULL,
    archival_photo_url  text,
    hints               jsonb NOT NULL DEFAULT '[]',
    base_reward_points  integer NOT NULL DEFAULT 40,
    base_xp             integer NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS task_rounds (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL,
    task_id        uuid NOT NULL REFERENCES tasks(id),
    started_at     timestamptz NOT NULL DEFAULT now(),
    hints_used     integer NOT NULL DEFAULT 0,
    reward_points  integer NOT NULL DEFAULT 40,
    status         text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS attempts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id          uuid NOT NULL REFERENCES task_rounds(id),
    photo_url         text NOT NULL,              -- storage key of the player photo
    gps               geography(Point, 4326),
    accuracy_m        real,
    status            text NOT NULL DEFAULT 'awaiting_upload'
                      CHECK (status IN ('awaiting_upload', 'queued', 'accepted', 'rejected')),
    -- written by the worker:
    score             real,
    reason            text CHECK (reason IN ('wrong_place', 'not_matched')),
    matched_place_id  uuid REFERENCES places(id), -- wrong_place_name = places.name of this
    judge             text,                       -- 'none' or the judge provider name
    created_at        timestamptz NOT NULL DEFAULT now(),
    verified_at       timestamptz
);

CREATE TABLE IF NOT EXISTS place_refs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id    uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    photo_url   text NOT NULL,                    -- storage key of the reference photo
    source_url  text,                             -- e.g. Commons file page
    author      text,
    license     text,
    sha256      text NOT NULL,
    model       text NOT NULL,                    -- embedding model, e.g. facebook/dinov2-base
    embedding   vector(768) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (place_id, sha256)
);

CREATE INDEX IF NOT EXISTS place_refs_embedding_hnsw
    ON place_refs USING hnsw (embedding vector_cosine_ops);
