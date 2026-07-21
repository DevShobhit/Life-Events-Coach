from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.preferences import NotificationPreferenceRepository
from app.modules.notifications.repository import NotificationIntentRepository
from app.modules.notifications.scheduler import NotificationIntent

logger = structlog.get_logger()


class NotificationProvider(Protocol):
    async def send(self, intent: NotificationIntent) -> None:
        """Deliver an intent through a deployment-specific provider."""


@dataclass(frozen=True)
class NotificationDeliveryReport:
    claimed: int
    sent: int
    retryable: int
    failed: int


class NotificationDeliveryWorker:
    """Execute durable intents without coupling the API to a provider SDK."""

    def __init__(
        self,
        session: AsyncSession,
        provider: NotificationProvider,
        *,
        max_attempts: int = 3,
        claim_timeout: timedelta = timedelta(minutes=15),
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be positive")
        if claim_timeout <= timedelta(0):
            raise ValueError("claim_timeout must be positive")
        self._session = session
        self._provider = provider
        self._max_attempts = max_attempts
        self._claim_timeout = claim_timeout

    async def enqueue(self, intent: NotificationIntent) -> None:
        await NotificationIntentRepository(self._session).enqueue(intent)
        await NotificationPreferenceRepository(self._session).mark_delivery(
            intent.user_id, status="scheduled", delivered_at=None
        )

    async def deliver_pending(
        self, *, limit: int = 50, now: datetime | None = None
    ) -> NotificationDeliveryReport:
        current_time = now or datetime.now(UTC)
        intents = await NotificationIntentRepository(self._session).claim_pending(
            limit=limit,
            now=current_time,
            claim_timeout=self._claim_timeout,
            max_attempts=self._max_attempts,
        )
        sent = retryable = failed = 0
        intent_repository = NotificationIntentRepository(self._session)
        preference_repository = NotificationPreferenceRepository(self._session)
        for record in intents:
            notification = NotificationIntent(
                user_id=record.user_id,
                local_day=record.local_day,
                phase_ids=tuple(record.phase_ids),
                dedupe_key=record.dedupe_key,
                reason=record.reason,
            )
            try:
                await self._provider.send(notification)
            except Exception:
                await intent_repository.mark_failed(
                    record.dedupe_key,
                    error="notification provider delivery failed",
                    max_attempts=self._max_attempts,
                )
                terminal = record.attempts >= self._max_attempts
                await preference_repository.mark_delivery(
                    record.user_id,
                    status="failed" if terminal else "scheduled",
                    delivered_at=None,
                )
                if terminal:
                    failed += 1
                else:
                    retryable += 1
                continue
            await intent_repository.mark_sent(
                record.dedupe_key, delivered_at=current_time
            )
            await preference_repository.mark_delivery(
                record.user_id, status="sent", delivered_at=current_time
            )
            sent += 1
        report = NotificationDeliveryReport(
            claimed=len(intents), sent=sent, retryable=retryable, failed=failed
        )
        logger.info(
            "notification.delivery.completed",
            claimed=report.claimed,
            sent=report.sent,
            retryable=report.retryable,
            failed=report.failed,
        )
        return report
