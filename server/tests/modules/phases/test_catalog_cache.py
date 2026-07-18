import asyncio
from typing import cast

import pytest
from app.core.errors import DependencyUnavailableError
from app.modules.phases.cache import ActivePhaseModuleCache
from app.modules.phases.catalog import get_persisted_module
from app.modules.phases.fixtures import LAUNCH_RELOCATION
from sqlalchemy.ext.asyncio import AsyncSession


class FailingSession:
    pass


def test_database_failure_uses_stale_validated_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = [0.0]
    cache = ActivePhaseModuleCache(ttl_seconds=1, clock=lambda: now[0])
    cache.put("relocation", version=4, module=LAUNCH_RELOCATION)
    now[0] = 2.0

    class FailingRepository:
        def __init__(self, _session: object) -> None:
            pass

        async def get_active_versioned(self, _phase_id: str) -> None:
            raise ConnectionError("database unavailable")

    monkeypatch.setattr(
        "app.modules.phases.catalog.PhaseModuleRepository", FailingRepository
    )
    result = asyncio.run(
        get_persisted_module(
            cast(AsyncSession, FailingSession()), "relocation", cache=cache
        )
    )

    assert result is not None
    assert result.version == 4


def test_database_failure_without_cache_is_typed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingRepository:
        def __init__(self, _session: object) -> None:
            pass

        async def get_active_versioned(self, _phase_id: str) -> None:
            raise ConnectionError("database unavailable")

    monkeypatch.setattr(
        "app.modules.phases.catalog.PhaseModuleRepository", FailingRepository
    )
    with pytest.raises(DependencyUnavailableError, match="temporarily unavailable"):
        asyncio.run(
            get_persisted_module(
                cast(AsyncSession, FailingSession()),
                "relocation",
                cache=ActivePhaseModuleCache(),
            )
        )
