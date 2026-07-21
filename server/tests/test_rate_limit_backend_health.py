from app.core.rate_limit import RedisSlidingWindowRateLimiter


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
