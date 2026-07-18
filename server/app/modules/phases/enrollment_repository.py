from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import PhaseEnrollment
from app.modules.phases.repository import session_transaction
from app.modules.phases.schemas import Enrollment


class EnrollmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, enrollment: Enrollment) -> None:
        async with session_transaction(self._session):
            record = await self._session.get(
                PhaseEnrollment, (enrollment.user_id, enrollment.phase_id)
            )
            if record is None:
                self._session.add(
                    PhaseEnrollment(
                        user_id=enrollment.user_id,
                        phase_id=enrollment.phase_id,
                        context=enrollment.context,
                        progress_anchor=enrollment.progress_anchor,
                    )
                )
            else:
                record.context = enrollment.context

    async def get(self, user_id: str, phase_id: str) -> Enrollment | None:
        record = await self._session.get(PhaseEnrollment, (user_id, phase_id))
        return (
            Enrollment.model_validate(
                {
                    "user_id": record.user_id,
                    "phase_id": record.phase_id,
                    "context": record.context,
                    "progress_anchor": record.progress_anchor,
                }
            )
            if record is not None
            else None
        )
