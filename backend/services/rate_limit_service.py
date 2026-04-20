from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque
from functools import lru_cache

from core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency in some local envs
    import redis.asyncio as redis_async
except Exception:  # pragma: no cover - keep local fallback available
    redis_async = None

_local_rate_limit_lock = threading.Lock()
_local_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)
_redis_warning_logged = False

_REDIS_INCR_WITH_TTL = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
"""


def reset_rate_limit_store() -> None:
    global _redis_warning_logged
    with _local_rate_limit_lock:
        _local_rate_limit_buckets.clear()
    _redis_warning_logged = False
    cache_clear = getattr(get_redis_rate_limit_client, "cache_clear", None)
    if callable(cache_clear):
        cache_clear()


@lru_cache(maxsize=1)
def get_redis_rate_limit_client():
    if not settings.rate_limit_use_redis or not settings.redis_url.strip() or redis_async is None:
        return None
    return redis_async.from_url(
        settings.redis_url.strip(),
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=settings.health_probe_timeout_seconds,
        socket_timeout=settings.health_probe_timeout_seconds,
    )


async def consume_rate_limit(bucket_key: str, limit: int, window_seconds: int) -> tuple[bool, int, str]:
    redis_key = f"{settings.rate_limit_redis_prefix}:{bucket_key}"
    client = get_redis_rate_limit_client()
    if client is not None:
        try:
            current_count, ttl = await client.eval(_REDIS_INCR_WITH_TTL, 1, redis_key, int(window_seconds))
            current_count = int(current_count)
            ttl = max(1, int(ttl) if int(ttl) > 0 else int(window_seconds))
            return current_count <= limit, ttl, "redis"
        except Exception as exc:
            _log_redis_fallback_once(exc)

    return _consume_local_rate_limit(bucket_key, limit, window_seconds)


def _consume_local_rate_limit(bucket_key: str, limit: int, window_seconds: int) -> tuple[bool, int, str]:
    now = time.monotonic()
    with _local_rate_limit_lock:
        bucket = _local_rate_limit_buckets[bucket_key]
        while bucket and now - bucket[0] >= window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            return False, retry_after, "local"

        bucket.append(now)
        return True, window_seconds, "local"


def _log_redis_fallback_once(exc: Exception) -> None:
    global _redis_warning_logged
    if _redis_warning_logged:
        return
    _redis_warning_logged = True
    logger.warning("rate_limit.redis_unavailable_falling_back_to_local error=%s", exc)
