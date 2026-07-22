from datetime import UTC, datetime

import pytest
from app.modules.notifications.preferences import (
    NotificationPreferenceRepository,
    NotificationPreferenceUpdate,
)
from app.modules.notifications.repository import NotificationIntentRepository
from app.modules.notifications.service import NotificationSchedulingService
from app.modules.phases.orm_models import Base
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
async def test_scheduler_enqueues_one_consolidated_intent_for_due_preference(session):
    preferences = NotificationPreferenceRepository(session)
    await preferences.upsert(
        "user-1", NotificationPreferenceUpdate(enabled=True, timezone="UTC")
    )
    service = NotificationSchedulingService(session)

    report = await service.schedule_due(
        now=datetime(2026, 7, 21, 9, tzinfo=UTC),
        phase_ids_for_user=lambda user_id: ["phase-b", "phase-a"],
        completed_today_for_user=lambda preference: False,
    )

    assert report.scheduled == 1
    records = await NotificationIntentRepository(session).claim_pending()
    assert records[0].phase_ids == ["phase-a", "phase-b"]


@pytest.mark.anyio
async def test_scheduler_skips_disabled_and_completed_preferences(session):
    preferences = NotificationPreferenceRepository(session)
    await preferences.upsert("disabled", NotificationPreferenceUpdate(enabled=False))
    await preferences.upsert("completed", NotificationPreferenceUpdate(enabled=True))
    service = NotificationSchedulingService(session)

    report = await service.schedule_due(
        now=datetime(2026, 7, 21, 9, tzinfo=UTC),
        phase_ids_for_user=lambda user_id: ["phase-a"],
        completed_today_for_user=lambda preference: preference.user_id == "completed",
    )

    assert report.scheduled == 0
    assert report.considered == 1
    assert report.skipped == 1
