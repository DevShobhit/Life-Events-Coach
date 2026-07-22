from collections.abc import AsyncGenerator
from datetime import date

import pytest
from app.modules.phases.enrollment_repository import EnrollmentRepository
from app.modules.phases.orm_models import Base
from app.modules.phases.schemas import Enrollment, EnrollmentLifecycleEvent
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
async def test_complete_archive_and_history_are_explicit_and_ordered(
    session: AsyncSession,
) -> None:
    repository = EnrollmentRepository(session)
    enrollment = Enrollment(
        user_id="user-1",
        phase_id="relocation",
        context={"relocation_stage": "arrived"},
        progress_anchor=date(2026, 7, 21),
    )
    await repository.save(enrollment)

    completed = await repository.transition("user-1", "relocation", "completed")
    archived = await repository.transition("user-1", "relocation", "archived")
    history = await repository.history("user-1")

    assert completed.status == "completed"
    assert archived.status == "archived"
    assert [event.event for event in history] == ["archived", "completed"]
    assert all(isinstance(event, EnrollmentLifecycleEvent) for event in history)


@pytest.mark.anyio
async def test_lifecycle_transition_rejects_repeated_archive_and_other_subject(
    session: AsyncSession,
) -> None:
    repository = EnrollmentRepository(session)
    await repository.save(Enrollment(user_id="user-1", phase_id="relocation"))
    await repository.transition("user-1", "relocation", "archived")

    with pytest.raises(ValueError, match="already archived"):
        await repository.transition("user-1", "relocation", "archived")
    assert await repository.history("user-2") == []
