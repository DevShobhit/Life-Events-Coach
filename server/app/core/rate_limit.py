from collections import defaultdict, deque
from collections.abc import Callable
from math import ceil
from time import monotonic
from typing import Protocol

from app.core.settings import Settings


class RedisEvalClient(Protocol):
    def eval(self, script: str, numkeys: int, *args: object) -> int: ...


_REDIS_SLIDING_WINDOW_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if current > tonumber(ARGV[1]) then return 0 end
return 1
"""


class SlidingWindowRateLimiter:
    def __init__(
        self,
        *,
        max_requests: int,
        window_seconds: float,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if max_requests < 1 or window_seconds <= 0:
            raise ValueError("rate-limit bounds must be positive")
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clock = clock
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)

    def allow(self, scope: str) -> bool:
        now = self._clock()
        cutoff = now - self.window_seconds
        for existing_scope, existing_requests in list(self._requests.items()):
            while existing_requests and existing_requests[0] <= cutoff:
                existing_requests.popleft()
            if not existing_requests:
                del self._requests[existing_scope]

        requests = self._requests.setdefault(scope, deque())
        if len(requests) >= self.max_requests:
            return False
        requests.append(now)
        return True


class RedisSlidingWindowRateLimiter:
    """Atomic fixed-window backend shared by all API worker processes."""

    def __init__(
        self,
        *,
        redis_client: RedisEvalClient,
        max_requests: int,
        window_seconds: float,
        key_prefix: str = "livecoach:rate-limit",
        fail_open: bool = False,
    ) -> None:
        if max_requests < 1 or window_seconds <= 0:
            raise ValueError("rate-limit bounds must be positive")
        if not key_prefix.strip():
            raise ValueError("rate-limit key prefix must not be empty")
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix.rstrip(":")
        self._redis = redis_client
        self._fail_open = fail_open

    def allow(self, scope: str) -> bool:
        key = f"{self.key_prefix}:{scope}"
        try:
            result = self._redis.eval(
                _REDIS_SLIDING_WINDOW_SCRIPT,
                1,
                key,
                self.max_requests,
                ceil(self.window_seconds),
            )
        except Exception:
            if self._fail_open:
                return True
            raise
        return bool(result)


def configured_rate_limiter(
    settings: Settings,
) -> SlidingWindowRateLimiter | RedisSlidingWindowRateLimiter:
    redis_url = settings.protected_rate_limit_redis_url
    max_requests = settings.protected_rate_limit_requests
    window_seconds = settings.protected_rate_limit_window_seconds
    if not redis_url:
        return SlidingWindowRateLimiter(
            max_requests=max_requests, window_seconds=window_seconds
        )
    try:
        from redis import Redis
    except ImportError as error:
        raise RuntimeError("redis package is required for distributed rate limiting") from error
    return RedisSlidingWindowRateLimiter(
        redis_client=Redis.from_url(redis_url),
        max_requests=max_requests,
        window_seconds=window_seconds,
        fail_open=settings.protected_rate_limit_redis_fail_open,
    )


def route_family(path: str) -> str | None:
    first_segment = path.strip("/").split("/", 1)[0]
    return (
        first_segment
        if first_segment in {"roadmap", "ask", "enrollment", "editorial"}
        else None
    )
