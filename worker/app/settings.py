from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Thresholds(BaseSettings):
    """Cosine-similarity thresholds. Tuned with `python -m app.cli.calibrate`.

    Defaults: DINOv2-base, 130 refs (Commons + Openverse), 47 Openverse test photos
    + 27 negatives (2026-10-10): 42/47 accepted, 0/545 false accepts.
    """

    model_config = SettingsConfigDict(env_prefix="VERIFY_", env_file=".env", extra="ignore")

    t_low: float = Field(0.35, description="below: rejected, not_matched")
    t_high: float = Field(0.61, description="at or above (with margin): accepted")
    margin: float = Field(0.09, description="target must beat the best other place by this much")
    t_single: float = Field(0.61, description="gray-zone fallback when no judge is configured")

    @model_validator(mode="after")
    def _ordered(self) -> "Thresholds":
        if not self.t_low <= self.t_single <= self.t_high:
            raise ValueError("expected t_low <= t_single <= t_high")
        return self


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lowcy:change-me@localhost:5432/lowcy"
    redis_url: str = "redis://localhost:6379/0"
    # Queue names are the API's contract (api/app/core/redis.py): we consume `verify_attempt`
    # from arq_queue and hand every verdict back as an `apply_verdict` job on api_queue.
    arq_queue: str = "arq:queue:ml"
    api_queue: str = "arq:queue:api"

    model_name: str = "facebook/dinov2-base"
    model_device: str = "cpu"
    embed_flip_tta: bool = True
    search_top_k: int = 20

    storage_backend: Literal["local", "s3"] = "local"
    storage_local_root: str = "../.storage"
    s3_endpoint_url: str | None = None
    s3_bucket: str = "lowcy"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "auto"
    # The API deletes the player photo when it applies the verdict (NFT-06); only turn this on
    # when the worker runs without the API's apply_verdict consumer.
    delete_photo_after_verdict: bool = False

    # Gray-zone judge. "none" = decide with Thresholds.t_single only.
    judge_provider: str = "none"
    judge_max_refs: int = 2

    thresholds: Thresholds = Field(default_factory=Thresholds)


@lru_cache
def get_settings() -> Settings:
    return Settings()
