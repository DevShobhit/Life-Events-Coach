import inspect
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass
from datetime import datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.preferences import NotificationPreferenceRepository
from app.modules.notifications.repository import NotificationIntentRepository
from app.modules.notifications.scheduler import build_daily_intent

logger = structlog.get_logger()

PhaseIdsResolver = Callable[[str], Iterable[str] | Awaitable[Iterable[str]]]
CompletionResolver = Callable[[str], bool | Awaitable[bool]]


@dataclass(frozen=True)
class NotificationScheduleReport:
    considered: int
    scheduled: int
    skipped: int


class NotificationSchedulingService:
    """Create durable daily intents; deployment code owns invocation cadence."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def schedule_due(
        self,
        *,
        now: datetime,
        phase_ids_for_user: PhaseIdsResolver,
        completed_today_for_user: CompletionResolver,
    ) -> NotificationScheduleReport:
        preferences = await NotificationPreferenceRepository(
            self._session
        ).list_enabled()
        intent_repository = NotificationIntentRepository(self._session)
        scheduled = 0
        skipped = 0
        for preference in preferences:
            phase_ids = phase_ids_for_user(preference.user_id)
            if inspect.isawaitable(phase_ids):
                phase_ids = await phase_ids
            completed_today = completed_today_for_user(preference.user_id)
            if inspect.isawaitable(completed_today):
                completed_today = await completed_today
            intent = build_daily_intent(
                preference,
                now=now,
                phase_ids=list(phase_ids),
                completed_today=completed_today,
            )
            if intent is None:
                skipped += 1
                continue
            await intent_repository.enqueue(intent)
            await NotificationPreferenceRepository(self._session).mark_delivery(
                preference.user_id, status="scheduled", delivered_at=None
            )
            scheduled += 1
        report = NotificationScheduleReport(
            considered=len(preferences), scheduled=scheduled, skipped=skipped
        )
        logger.info(
            "notification.schedule.completed",
            considered=report.considered,
            scheduled=report.scheduled,
            skipped=report.skipped,
        )
        return report
