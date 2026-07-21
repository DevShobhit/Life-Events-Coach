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


def route_family(path: str) -> str | None:
    first_segment = path.strip("/").split("/", 1)[0]
    return (
        first_segment
        if first_segment in {"roadmap", "ask", "enrollment", "editorial"}
        else None
    )
