from datetime import date

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import CardProgressRecord, PhaseEnrollment


class NotificationWorkRepository:
    """Read the user-owned unfinished-work signals used by notification scheduling."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def active_phase_ids(self, user_id: str) -> list[str]:
        result = await self._session.execute(
            select(PhaseEnrollment.phase_id)
            .where(
                PhaseEnrollment.user_id == user_id,
                PhaseEnrollment.status == "active",
            )
            .order_by(PhaseEnrollment.phase_id)
        )
        return list(result.scalars().all())

    async def completed_today(self, user_id: str, local_day: date) -> bool:
        result = await self._session.execute(
            select(
                exists().where(
                    CardProgressRecord.user_id == user_id,
                    CardProgressRecord.completed_on == local_day,
                )
            )
        )
        return bool(result.scalar())
