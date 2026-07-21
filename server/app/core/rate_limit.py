from collections import defaultdict, deque
from collections.abc import Callable
from time import monotonic


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
        requests = self._requests[scope]
        cutoff = now - self.window_seconds
        while requests and requests[0] <= cutoff:
            requests.popleft()
        if len(requests) >= self.max_requests:
            return False
        requests.append(now)
        return True


def route_family(path: str) -> str | None:
    first_segment = path.strip("/").split("/", 1)[0]
    return (
        first_segment
        if first_segment in {"roadmap", "ask", "enrollment", "editorial"}
        else None
    )
