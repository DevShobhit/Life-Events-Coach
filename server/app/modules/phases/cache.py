from collections.abc import Callable
from dataclasses import dataclass
from time import monotonic

from app.modules.phases.schemas import PhaseModule


@dataclass(frozen=True)
class CachedPhaseModule:
    version: int
    module: PhaseModule
    stored_at: float


class ActivePhaseModuleCache:
    def __init__(
        self, *, ttl_seconds: float = 30.0, clock: Callable[[], float] = monotonic
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._entries: dict[str, CachedPhaseModule] = {}

    def put(self, phase_id: str, *, version: int, module: PhaseModule) -> None:
        self._entries[phase_id] = CachedPhaseModule(
            version=version, module=module, stored_at=self._clock()
        )

    def get(self, phase_id: str) -> CachedPhaseModule | None:
        entry = self._entries.get(phase_id)
        if entry is None or self._clock() - entry.stored_at >= self._ttl_seconds:
            return None
        return entry

    def get_stale(self, phase_id: str) -> CachedPhaseModule | None:
        return self._entries.get(phase_id)

    def invalidate(self, phase_id: str) -> None:
        self._entries.pop(phase_id, None)


active_phase_module_cache = ActivePhaseModuleCache()
