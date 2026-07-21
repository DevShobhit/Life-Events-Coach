from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import PhaseModuleActive, PhaseModuleVersion
from app.modules.phases.schemas import PhaseModule


@asynccontextmanager
async def session_transaction(session: AsyncSession) -> AsyncIterator[None]:
    if session.in_transaction():
        yield
        await session.commit()
    else:
        async with session.begin():
            yield


class PhaseModuleRepository:
    """Persist and read immutable published phase-module versions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def publish(self, module: PhaseModule, *, version: int) -> None:
        if version < 1:
            raise ValueError("version must be positive")

        async with session_transaction(self._session):
            self._session.add(
                PhaseModuleVersion(
                    phase_id=module.phase_id,
                    version=version,
                    schema_version=module.schema_version,
                    content=module.model_dump(mode="json"),
                )
            )
            await self._session.flush()
            active = await self._session.get(PhaseModuleActive, module.phase_id)
            if active is None:
                self._session.add(
                    PhaseModuleActive(phase_id=module.phase_id, version=version)
                )
            else:
                active.version = version

    async def get_active(self, phase_id: str) -> PhaseModule | None:
        active = await self.get_active_versioned(phase_id)
        return active[1] if active is not None else None

    async def get_active_versioned(
        self, phase_id: str
    ) -> tuple[int, PhaseModule] | None:
        statement = (
            select(PhaseModuleVersion)
            .join(
                PhaseModuleActive,
                (PhaseModuleActive.phase_id == PhaseModuleVersion.phase_id)
                & (PhaseModuleActive.version == PhaseModuleVersion.version),
            )
            .where(
                PhaseModuleActive.phase_id == phase_id,
                PhaseModuleVersion.status == "published",
            )
        )
        result = await self._session.execute(statement)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return row.version, PhaseModule.model_validate(row.content)

    async def list_active_versioned(self) -> list[tuple[int, PhaseModule]]:
        statement = (
            select(PhaseModuleVersion)
            .join(
                PhaseModuleActive,
                (PhaseModuleActive.phase_id == PhaseModuleVersion.phase_id)
                & (PhaseModuleActive.version == PhaseModuleVersion.version),
            )
            .where(PhaseModuleVersion.status == "published")
            .order_by(PhaseModuleVersion.phase_id)
        )
        result = await self._session.execute(statement)
        return [
            (row.version, PhaseModule.model_validate(row.content))
            for row in result.scalars().all()
        ]
