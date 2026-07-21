from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import (
    CardActionRecord,
    CardProgressRecord,
    NotificationPreferenceRecord,
    PhaseEnrollment,
    PhaseLifecycleEventRecord,
)
from app.modules.phases.repository import session_transaction


class AccountDeleteRequest(BaseModel):
    confirm: bool = Field(default=False)


class AccountDataExport(BaseModel):
    schema_version: str = "1.0"
    generated_at: datetime
    enrollments: list[dict[str, Any]]
    card_progress: list[dict[str, Any]]
    card_actions: list[dict[str, Any]]
    notification_preferences: list[dict[str, Any]]
    lifecycle_events: list[dict[str, Any]]


def _enrollment(row: PhaseEnrollment) -> dict[str, Any]:
    return {
        "phase_id": row.phase_id,
        "context": row.context,
        "progress_anchor": row.progress_anchor,
        "status": row.status,
        "completed_at": row.completed_at,
        "archived_at": row.archived_at,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


async def export_account_data(session: AsyncSession, user_id: str) -> AccountDataExport:
    enrollments = (
        (await session.execute(select(PhaseEnrollment).where(PhaseEnrollment.user_id == user_id)))
        .scalars()
        .all()
    )
    progress = (
        (
            await session.execute(
                select(CardProgressRecord).where(CardProgressRecord.user_id == user_id)
            )
        )
        .scalars()
        .all()
    )
    actions = (
        (await session.execute(select(CardActionRecord).where(CardActionRecord.user_id == user_id)))
        .scalars()
        .all()
    )
    preferences = (
        (
            await session.execute(
                select(NotificationPreferenceRecord).where(
                    NotificationPreferenceRecord.user_id == user_id
                )
            )
        )
        .scalars()
        .all()
    )
    events = (
        (
            await session.execute(
                select(PhaseLifecycleEventRecord).where(
                    PhaseLifecycleEventRecord.user_id == user_id
                )
            )
        )
        .scalars()
        .all()
    )
    return AccountDataExport(
        generated_at=datetime.now(),
        enrollments=[_enrollment(row) for row in enrollments],
        card_progress=[
            {
                k: getattr(row, k)
                for k in ("phase_id", "concern_id", "status", "skip_count", "completed_on")
            }
            for row in progress
        ],
        card_actions=[
            {
                k: getattr(row, k)
                for k in (
                    "phase_id",
                    "concern_id",
                    "idempotency_key",
                    "action",
                    "resulting_status",
                    "skip_count",
                    "created_at",
                )
            }
            for row in actions
        ],
        notification_preferences=[
            {
                k: getattr(row, k)
                for k in (
                    "enabled",
                    "timezone",
                    "local_time",
                    "delivery_status",
                    "last_delivery_at",
                )
            }
            for row in preferences
        ],
        lifecycle_events=[
            {k: getattr(row, k) for k in ("phase_id", "event", "occurred_at")} for row in events
        ],
    )


async def delete_account_data(session: AsyncSession, user_id: str) -> None:
    async with session_transaction(session):
        for model in (
            PhaseLifecycleEventRecord,
            CardActionRecord,
            CardProgressRecord,
            NotificationPreferenceRecord,
            PhaseEnrollment,
        ):
            await session.execute(delete(model).where(model.user_id == user_id))
