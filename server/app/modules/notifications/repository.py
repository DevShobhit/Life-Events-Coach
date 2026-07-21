from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.scheduler import NotificationIntent
from app.modules.phases.orm_models import NotificationIntentRecord
from app.modules.phases.repository import session_transaction


class NotificationIntentRepository:
    """Durable, idempotent intent store for a single-process delivery worker."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def enqueue(self, intent: NotificationIntent) -> NotificationIntentRecord:
        async with session_transaction(self._session):
            record = await self._session.get(
                NotificationIntentRecord, intent.dedupe_key
            )
            if record is None:
                record = NotificationIntentRecord(
                    dedupe_key=intent.dedupe_key,
                    user_id=intent.user_id,
                    local_day=intent.local_day,
                    phase_ids=list(intent.phase_ids),
                    reason=intent.reason,
                )
                self._session.add(record)
        return await self._require(intent.dedupe_key)

    async def claim_pending(self, *, limit: int = 50) -> list[NotificationIntentRecord]:
        if limit < 1:
            raise ValueError("limit must be positive")
        async with session_transaction(self._session):
            result = await self._session.execute(
                select(NotificationIntentRecord)
                .where(NotificationIntentRecord.status == "pending")
                .order_by(NotificationIntentRecord.created_at)
                .limit(limit)
            )
            records = list(result.scalars().all())
            now = datetime.now().astimezone()
            for record in records:
                record.status = "claimed"
                record.claimed_at = now
                record.attempts += 1
        return records

    async def mark_sent(self, dedupe_key: str, *, delivered_at: datetime) -> None:
        async with session_transaction(self._session):
            record = await self._require(dedupe_key)
            record.status = "sent"
            record.delivered_at = delivered_at
            record.last_error = None

    async def mark_failed(self, dedupe_key: str, *, error: str) -> None:
        async with session_transaction(self._session):
            record = await self._require(dedupe_key)
            record.status = "failed"
            record.last_error = error[:500]

    async def _require(self, dedupe_key: str) -> NotificationIntentRecord:
        record = await self._session.get(NotificationIntentRecord, dedupe_key)
        if record is None:
            raise RuntimeError("notification intent was not persisted")
        return record
