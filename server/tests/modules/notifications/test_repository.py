from datetime import UTC, date, datetime, timedelta

import pytest
from app.modules.notifications.repository import NotificationIntentRepository
from app.modules.notifications.scheduler import NotificationIntent
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


def intent(key: str = "daily:u:2026-07-21") -> NotificationIntent:
    return NotificationIntent("u", date(2026, 7, 21), ("p1",), key)


@pytest.mark.anyio
async def test_enqueue_is_idempotent_and_claims_pending(session):
    repository = NotificationIntentRepository(session)
    first = await repository.enqueue(intent())
    second = await repository.enqueue(intent())

    assert first.dedupe_key == second.dedupe_key
    claimed = await repository.claim_pending()
    assert [record.dedupe_key for record in claimed] == [first.dedupe_key]
    assert claimed[0].status == "claimed"
    assert await repository.claim_pending() == []


@pytest.mark.anyio
async def test_intent_delivery_statuses(session):
    repository = NotificationIntentRepository(session)
    await repository.enqueue(intent())
    await repository.claim_pending()
    delivered_at = datetime.now(UTC)
    await repository.mark_sent("daily:u:2026-07-21", delivered_at=delivered_at)
    record = await repository._require("daily:u:2026-07-21")
    assert record.status == "sent"
    assert record.delivered_at is not None


@pytest.mark.anyio
async def test_claim_limit_must_be_positive(session):
    with pytest.raises(ValueError):
        await NotificationIntentRepository(session).claim_pending(limit=0)


@pytest.mark.anyio
async def test_stale_claim_is_reclaimed_after_worker_interruption(session):
    repository = NotificationIntentRepository(session)
    await repository.enqueue(intent())
    claimed = await repository.claim_pending(now=datetime(2026, 7, 21, 9, tzinfo=UTC))
    claimed[0].claimed_at = datetime(2026, 7, 21, 9, tzinfo=UTC)
    await session.commit()

    reclaimed = await repository.claim_pending(
        now=datetime(2026, 7, 21, 10, tzinfo=UTC),
        claim_timeout=timedelta(minutes=30),
    )

    assert [record.dedupe_key for record in reclaimed] == ["daily:u:2026-07-21"]
    assert reclaimed[0].status == "claimed"
    assert reclaimed[0].attempts == 2


@pytest.mark.anyio
async def test_retryable_failure_requeues_until_attempt_limit(session):
    repository = NotificationIntentRepository(session)
    await repository.enqueue(intent())
    await repository.claim_pending()

    await repository.mark_failed(
        "daily:u:2026-07-21", error="temporary provider failure"
    )
    record = await repository._require("daily:u:2026-07-21")
    assert record.status == "pending"
    assert record.last_error == "temporary provider failure"

    await repository.claim_pending()
    await repository.mark_failed(
        "daily:u:2026-07-21", error="temporary provider failure", max_attempts=2
    )
    record = await repository._require("daily:u:2026-07-21")
    assert record.status == "failed"
