import structlog
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DependencyUnavailableError
from app.modules.phases.cache import ActivePhaseModuleCache, active_phase_module_cache
from app.modules.phases.fixtures import LAUNCH_RELOCATION, LAUNCH_RELOCATION_VERSION
from app.modules.phases.repository import PhaseModuleRepository
from app.modules.phases.schemas import PhaseModule

logger = structlog.get_logger()
active_module_cache = active_phase_module_cache


class PublishedPhaseModule(BaseModel):
    version: int
    module: PhaseModule


def list_catalog() -> list[PublishedPhaseModule]:
    return [
        PublishedPhaseModule(
            version=LAUNCH_RELOCATION_VERSION, module=LAUNCH_RELOCATION
        )
    ]


def get_module(phase_id: str) -> PublishedPhaseModule | None:
    return next(
        (entry for entry in list_catalog() if entry.module.phase_id == phase_id), None
    )


async def get_persisted_module(
    session: AsyncSession,
    phase_id: str,
    *,
    cache: ActivePhaseModuleCache = active_module_cache,
) -> PublishedPhaseModule | None:
    cached = cache.get(phase_id)
    if cached is not None:
        return PublishedPhaseModule(version=cached.version, module=cached.module)
    try:
        active = await PhaseModuleRepository(session).get_active_versioned(phase_id)
    except Exception as error:
        stale = cache.get_stale(phase_id)
        if stale is not None:
            logger.warning(
                "phase.module.cache_fallback",
                phase_id=phase_id,
                version=stale.version,
            )
            return PublishedPhaseModule(version=stale.version, module=stale.module)
        raise DependencyUnavailableError() from error
    if active is None:
        return None
    version, module = active
    cache.put(phase_id, version=version, module=module)
    return PublishedPhaseModule(version=version, module=module)
