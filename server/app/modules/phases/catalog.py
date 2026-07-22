import structlog
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DependencyUnavailableError
from app.modules.phases.cache import ActivePhaseModuleCache, active_phase_module_cache
from app.modules.phases.repository import PhaseModuleRepository
from app.modules.phases.schemas import PhaseModule

logger = structlog.get_logger()
active_module_cache = active_phase_module_cache


class PublishedPhaseModule(BaseModel):
    version: int
    module: PhaseModule


async def list_persisted_modules(session: AsyncSession) -> list[PublishedPhaseModule]:
    try:
        active = await PhaseModuleRepository(session).list_active_versioned()
    except Exception as error:
        raise DependencyUnavailableError() from error
    return [
        PublishedPhaseModule(version=version, module=module)
        for version, module in active
    ]


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
