from functools import lru_cache

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings
from redis.asyncio import Redis

from app.core.config import get_settings

ML_QUEUE = "ml"  # consumed by worker/ (role C): verify_attempt
API_QUEUE = "api"  # consumed by app.worker: apply_verdict


@lru_cache
def get_redis() -> Redis:
    client: Redis = Redis.from_url(get_settings().redis_dsn, decode_responses=True)
    return client


def arq_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_dsn)


_arq_pool: ArqRedis | None = None


async def get_arq() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(arq_settings())
    return _arq_pool


async def close_arq() -> None:
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.aclose()
        _arq_pool = None
