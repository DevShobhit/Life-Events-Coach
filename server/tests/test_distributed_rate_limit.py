from app.core.rate_limit import RedisSlidingWindowRateLimiter


class SharedRedis:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}

    def eval(self, script: str, numkeys: int, key: str, limit: int, window: int) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return int(self.counts[key] <= int(limit))


def test_redis_backend_shares_limit_between_limiter_instances() -> None:
    redis = SharedRedis()
    def factory(_: str) -> SharedRedis:
        return redis
    first = RedisSlidingWindowRateLimiter(
        redis_client=factory("redis://unused"), max_requests=2, window_seconds=60
    )
    second = RedisSlidingWindowRateLimiter(
        redis_client=factory("redis://unused"), max_requests=2, window_seconds=60
    )

    assert first.allow("shared-scope") is True
    assert second.allow("shared-scope") is True
    assert first.allow("shared-scope") is False
