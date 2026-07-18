from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.fixtures import LAUNCH_RELOCATION, LAUNCH_RELOCATION_VERSION
from app.modules.phases.repository import PhaseModuleRepository
from app.modules.phases.schemas import PhaseModule


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
    session: AsyncSession, phase_id: str
) -> PublishedPhaseModule | None:
    active = await PhaseModuleRepository(session).get_active_versioned(phase_id)
    if active is None:
        return None
    version, module = active
    return PublishedPhaseModule(version=version, module=module)
