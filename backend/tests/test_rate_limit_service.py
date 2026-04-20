import asyncio

from core.config import settings
from services import rate_limit_service


def test_rate_limit_service_uses_local_fallback_when_redis_disabled():
    original_use_redis = settings.rate_limit_use_redis
    settings.rate_limit_use_redis = False
    rate_limit_service.reset_rate_limit_store()

    try:
        allowed_first, _, backend_first = asyncio.run(rate_limit_service.consume_rate_limit("test-local", 1, 60))
        allowed_second, retry_after, backend_second = asyncio.run(rate_limit_service.consume_rate_limit("test-local", 1, 60))
    finally:
        settings.rate_limit_use_redis = original_use_redis
        rate_limit_service.reset_rate_limit_store()

    assert allowed_first is True
    assert allowed_second is False
    assert retry_after >= 1
    assert backend_first == "local"
    assert backend_second == "local"


def test_rate_limit_service_uses_redis_when_available(monkeypatch):
    class FakeRedisClient:
        async def eval(self, script, numkeys, key, window_seconds):
            assert "INCR" in script
            assert numkeys == 1
            assert key.startswith(settings.rate_limit_redis_prefix)
            assert window_seconds == 60
            return [1, 60]

    original_use_redis = settings.rate_limit_use_redis
    settings.rate_limit_use_redis = True
    rate_limit_service.reset_rate_limit_store()
    monkeypatch.setattr(rate_limit_service, "get_redis_rate_limit_client", lambda: FakeRedisClient())

    try:
        allowed, retry_after, backend = asyncio.run(rate_limit_service.consume_rate_limit("test-redis", 3, 60))
    finally:
        settings.rate_limit_use_redis = original_use_redis
        rate_limit_service.reset_rate_limit_store()

    assert allowed is True
    assert retry_after == 60
    assert backend == "redis"
