from datetime import UTC, date, datetime

import pytest
from app.modules.notifications.preferences import (
    NotificationPreferenceRepository,
    NotificationPreferenceUpdate,
)
from app.modules.notifications.scheduler import NotificationIntent
from app.modules.notifications.worker import NotificationDeliveryWorker
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


def intent() -> NotificationIntent:
    return NotificationIntent(
        "user-1",
        date(2026, 7, 21),
        ("relocation",),
        "daily:user-1:2026-07-21",
    )


class SuccessfulProvider:
    async def send(self, value: NotificationIntent) -> None:
        assert value.phase_ids == ("relocation",)


class RetryableProvider:
    async def send(self, value: NotificationIntent) -> None:
        raise RuntimeError("provider unavailable")


@pytest.mark.anyio
async def test_worker_marks_successful_delivery_and_preference(session):
    preferences = NotificationPreferenceRepository(session)
    await preferences.upsert("user-1", NotificationPreferenceUpdate(enabled=True))
    worker = NotificationDeliveryWorker(session, SuccessfulProvider())
    await worker.enqueue(intent())

    report = await worker.deliver_pending(now=datetime(2026, 7, 21, 9, tzinfo=UTC))

    assert report.sent == 1
    assert report.retryable == 0
    preference = await preferences.get("user-1")
    assert preference is not None
    assert preference.delivery_status == "sent"


@pytest.mark.anyio
async def test_worker_requeues_provider_failure_and_marks_scheduled(session):
    preferences = NotificationPreferenceRepository(session)
    await preferences.upsert("user-1", NotificationPreferenceUpdate(enabled=True))
    worker = NotificationDeliveryWorker(session, RetryableProvider())
    await worker.enqueue(intent())

    report = await worker.deliver_pending(now=datetime(2026, 7, 21, 9, tzinfo=UTC))

    assert report.sent == 0
    assert report.retryable == 1
    preference = await preferences.get("user-1")
    assert preference is not None
    assert preference.delivery_status == "scheduled"
