import pytest
from app.core.errors import DependencyUnavailableError
from app.core.rate_limit import RedisSlidingWindowRateLimiter
from app.main import enforce_protected_rate_limit, settings
from starlette.requests import Request


class HealthyRedis:
    def ping(self) -> bool:
        return True

    def eval(self, script: str, numkeys: int, *args: object) -> int:
        return 1


class BrokenRedis(HealthyRedis):
    def ping(self) -> bool:
        raise ConnectionError("redis unavailable")


def test_redis_rate_limit_backend_healthcheck_is_safe() -> None:
    healthy = RedisSlidingWindowRateLimiter(
        redis_client=HealthyRedis(), max_requests=1, window_seconds=60
    )
    broken = RedisSlidingWindowRateLimiter(
        redis_client=BrokenRedis(), max_requests=1, window_seconds=60
    )

    assert healthy.healthcheck() is True
    assert broken.healthcheck() is False


@pytest.mark.asyncio
async def test_protected_route_returns_safe_dependency_error_when_limiter_fails() -> None:
    import app.main as app_module

    class BrokenLimiter:
        def allow(self, scope: str) -> bool:
            raise ConnectionError("redis unavailable")

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/roadmap/user/relocation",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )
    previous_limiter = app_module.protected_rate_limiter
    previous_environment = settings.app_env
    app_module.protected_rate_limiter = BrokenLimiter()
    settings.app_env = "production"
    try:
        with pytest.raises(DependencyUnavailableError, match="rate limiting"):
            await enforce_protected_rate_limit(request)
    finally:
        app_module.protected_rate_limiter = previous_limiter
        settings.app_env = previous_environment
