from collections.abc import AsyncGenerator
from datetime import date

import pytest
from app.modules.phases.enrollment_repository import EnrollmentRepository
from app.modules.phases.orm_models import Base
from app.modules.phases.schemas import Enrollment
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as database_session:
        yield database_session
    await engine.dispose()


@pytest.mark.anyio
async def test_enrollment_upsert_preserves_user_phase_ownership_and_context(
    session: AsyncSession,
) -> None:
    repository = EnrollmentRepository(session)
    enrollment = Enrollment(
        user_id="user-1",
        phase_id="relocation",
        context={"origin_country": "A", "destination_country": "B"},
        progress_anchor=date(2026, 7, 18),
    )

    await repository.save(enrollment)
    updated = enrollment.model_copy(update={"context": {"relocation_stage": "arrived"}})
    await repository.save(updated)

    assert await repository.get("user-1", "relocation") == updated
    assert await repository.get("user-2", "relocation") is None


@pytest.mark.anyio
async def test_enrollment_read_requires_both_user_and_phase(
    session: AsyncSession,
) -> None:
    repository = EnrollmentRepository(session)
    await repository.save(Enrollment(user_id="user-1", phase_id="relocation"))

    assert await repository.get("user-1", "new_parent") is None
    assert await repository.get("user-2", "relocation") is None
