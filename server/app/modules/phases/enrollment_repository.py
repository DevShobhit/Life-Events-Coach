from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import PhaseEnrollment, PhaseLifecycleEventRecord
from app.modules.phases.repository import session_transaction
from app.modules.phases.schemas import Enrollment, EnrollmentLifecycleEvent


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
                        status=enrollment.status,
                        completed_at=enrollment.completed_at,
                        archived_at=enrollment.archived_at,
                    )
                )
            else:
                record.context = enrollment.context
                record.progress_anchor = enrollment.progress_anchor

    async def get(self, user_id: str, phase_id: str) -> Enrollment | None:
        record = await self._session.get(PhaseEnrollment, (user_id, phase_id))
        return (
            Enrollment.model_validate(
                {
                    "user_id": record.user_id,
                    "phase_id": record.phase_id,
                    "context": record.context,
                    "progress_anchor": record.progress_anchor,
                    "status": record.status,
                    "completed_at": record.completed_at,
                    "archived_at": record.archived_at,
                }
            )
            if record is not None
            else None
        )

    async def active(self, user_id: str) -> list[Enrollment]:
        result = await self._session.execute(
            select(PhaseEnrollment)
            .where(
                PhaseEnrollment.user_id == user_id,
                PhaseEnrollment.status == "active",
            )
            .order_by(PhaseEnrollment.phase_id)
        )
        return [
            Enrollment.model_validate(
                {
                    "user_id": record.user_id,
                    "phase_id": record.phase_id,
                    "context": record.context,
                    "progress_anchor": record.progress_anchor,
                    "status": record.status,
                    "completed_at": record.completed_at,
                    "archived_at": record.archived_at,
                }
            )
            for record in result.scalars()
        ]

    async def transition(
        self, user_id: str, phase_id: str, event: str
    ) -> Enrollment:
        if event not in {"completed", "archived"}:
            raise ValueError("unsupported lifecycle event")
        now = datetime.now(UTC)
        async with session_transaction(self._session):
            record = await self._session.get(PhaseEnrollment, (user_id, phase_id))
            if record is None:
                raise ValueError("enrollment not found")
            if event == "completed" and record.status != "active":
                raise ValueError(f"enrollment already {record.status}")
            if event == "archived" and record.status == "archived":
                raise ValueError("enrollment already archived")
            record.status = event
            if event == "completed":
                record.completed_at = now
            else:
                record.archived_at = now
            self._session.add(
                PhaseLifecycleEventRecord(
                    user_id=user_id,
                    phase_id=phase_id,
                    event=event,
                    occurred_at=now,
                )
            )
        result = await self.get(user_id, phase_id)
        if result is None:
            raise RuntimeError("enrollment transition was not persisted")
        return result

    async def history(self, user_id: str) -> list[EnrollmentLifecycleEvent]:
        result = await self._session.execute(
            select(PhaseLifecycleEventRecord)
            .where(PhaseLifecycleEventRecord.user_id == user_id)
            .order_by(desc(PhaseLifecycleEventRecord.occurred_at))
        )
        return [
            EnrollmentLifecycleEvent(
                event=record.event,
                occurred_at=record.occurred_at,
            )
            for record in result.scalars()
        ]
