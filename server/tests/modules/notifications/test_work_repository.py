from datetime import date

import pytest
from app.modules.notifications.work_repository import NotificationWorkRepository
from app.modules.phases.orm_models import Base, CardProgressRecord, PhaseEnrollment
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as value:
        yield value
    await engine.dispose()


@pytest.mark.anyio
async def test_work_repository_returns_active_phases_and_completion_for_day(session):
    session.add_all(
        [
            PhaseEnrollment(
                user_id="user-1",
                phase_id="active-phase",
                context={},
                progress_anchor=date(2026, 7, 20),
            ),
            PhaseEnrollment(
                user_id="user-1",
                phase_id="completed-phase",
                context={},
                progress_anchor=date(2026, 7, 20),
                status="completed",
            ),
            CardProgressRecord(
                user_id="user-1",
                phase_id="active-phase",
                concern_id="card-1",
                status="done",
                completed_on=date(2026, 7, 21),
            ),
        ]
    )
    await session.commit()
    repository = NotificationWorkRepository(session)

    assert await repository.active_phase_ids("user-1") == ["active-phase"]
    assert await repository.completed_today("user-1", date(2026, 7, 21)) is True
    assert await repository.completed_today("user-2", date(2026, 7, 21)) is False
