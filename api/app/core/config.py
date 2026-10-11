from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# The repository root `.env` is shared with docker compose. Environment variables win over the
# file, so containers get their own hosts/ports from compose.
_REPO_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ENV, env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"

    postgres_user: str = "lowcy"
    postgres_password: str = "change-me"
    postgres_db: str = "lowcy"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url: str | None = None

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_url: str | None = None

    jwt_secret: str = "dev-only-change-me"
    jwt_access_ttl_s: int = 15 * 60
    jwt_refresh_ttl_s: int = 30 * 24 * 3600

    s3_endpoint: str = "http://localhost:8333"
    # What the phone can reach (laptop IP or a tunnel). Presigned URLs are signed for this host.
    s3_public_endpoint: str | None = None
    s3_access_key: str = "lowcy"
    s3_secret_key: str = "change-me"
    s3_bucket: str = "lowcy"
    s3_region: str = "us-east-1"
    upload_url_ttl_s: int = 5 * 60

    # Accepts a manually set position from the client (long tap on the map). Never remove.
    demo_mode: bool = False
    # Without the ML worker: submit enqueues an "accepted" verdict straight to our own queue.
    verify_stub: bool = False

    admin_user: str = "admin"
    admin_password: str = "change-me"

    share_base_url: str = "https://lowcyhistorii.pl"

    welcome_points: int = 50
    referral_bonus_points: int = 20
    max_hints_per_round: int = 3
    max_attempts_per_round: int = 5
    hint_penalty: float = Field(default=0.25, description="share of base points lost per hint")
    hint_floor: float = Field(default=0.25, description="reward never drops below this share")
    gps_slack_max_m: int = 25
    login_attempts_per_minute: int = 5

    @property
    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_dsn(self) -> str:
        return self.redis_url or f"redis://{self.redis_host}:{self.redis_port}/0"

    @property
    def public_s3_endpoint(self) -> str:
        return self.s3_public_endpoint or self.s3_endpoint


@lru_cache
def get_settings() -> Settings:
    return Settings()
