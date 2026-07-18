from collections.abc import Mapping
from datetime import date
from typing import Any, Protocol

from pydantic import ValidationError

from app.modules.phases.cache import ActivePhaseModuleCache, active_phase_module_cache
from app.modules.phases.schemas import PhaseModule


class PhaseModuleWriter(Protocol):
    async def publish(self, module: PhaseModule, *, version: int) -> None: ...


class PublicationError(ValueError):
    def __init__(self, field_errors: dict[str, list[str]]) -> None:
        self.field_errors = field_errors
        super().__init__(
            "phase module publication validation failed: "
            + ", ".join(sorted(field_errors))
        )


class PhaseModuleCache:
    def __init__(self) -> None:
        self._modules: dict[str, PhaseModule] = {}

    def get(self, phase_id: str) -> PhaseModule | None:
        return self._modules.get(phase_id)

    def put(self, module: PhaseModule) -> None:
        self._modules[module.phase_id] = module

    def invalidate(self, phase_id: str) -> None:
        self._modules.pop(phase_id, None)


class PhaseModulePublisher:
    def __init__(
        self,
        repository: PhaseModuleWriter,
        cache: PhaseModuleCache,
        active_cache: ActivePhaseModuleCache = active_phase_module_cache,
    ) -> None:
        self._repository = repository
        self._cache = cache
        self._active_cache = active_cache

    async def publish(
        self,
        payload: Mapping[str, Any],
        *,
        version: int,
        today: date | None = None,
    ) -> PhaseModule:
        errors: dict[str, list[str]] = {}
        try:
            module = PhaseModule.model_validate(payload)
        except ValidationError as error:
            for item in error.errors():
                field = str(item["loc"][-1])
                errors.setdefault(field, []).append(str(item["msg"]))
            raise PublicationError(errors) from error

        current_date = today or date.today()
        for concern in module.concerns:
            if concern.citation.reviewed_on > current_date:
                errors.setdefault("reviewed_on", []).append(
                    f"citation {concern.citation.id} cannot be reviewed in the future"
                )
        if errors:
            raise PublicationError(errors)

        await self._repository.publish(module, version=version)
        self._cache.invalidate(module.phase_id)
        if self._active_cache is not None:
            self._active_cache.invalidate(module.phase_id)
        return module
