from redis.asyncio import Redis


async def hit(redis: Redis, key: str, limit: int, window_s: int) -> bool:
    """Fixed-window counter. Returns True when the call is still within the limit."""
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, window_s, nx=True)
        count, _ = await pipe.execute()
    return int(count) <= limit
