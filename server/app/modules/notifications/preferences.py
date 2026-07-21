from datetime import datetime, time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import NotificationPreferenceRecord
from app.modules.phases.repository import session_transaction

DeliveryStatus = Literal["not_configured", "scheduled", "sent", "failed"]


class NotificationPreferenceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    timezone: str = Field(default="UTC", min_length=1, max_length=100)
    local_time: time = time(9, 0)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("timezone must be a valid IANA timezone") from error
        return value


class NotificationPreference(NotificationPreferenceUpdate):
    user_id: str
    delivery_status: DeliveryStatus = "not_configured"
    last_delivery_at: datetime | None = None


class NotificationPreferenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: str) -> NotificationPreference | None:
        record = await self._session.get(NotificationPreferenceRecord, user_id)
        return self._to_schema(record) if record is not None else None

    async def upsert(
        self, user_id: str, update: NotificationPreferenceUpdate
    ) -> NotificationPreference:
        async with session_transaction(self._session):
            record = await self._session.get(NotificationPreferenceRecord, user_id)
            if record is None:
                record = NotificationPreferenceRecord(
                    user_id=user_id,
                    enabled=update.enabled,
                    timezone=update.timezone,
                    local_time=update.local_time,
                    delivery_status="not_configured",
                )
                self._session.add(record)
            else:
                record.enabled = update.enabled
                record.timezone = update.timezone
                record.local_time = update.local_time
        refreshed = await self._session.get(NotificationPreferenceRecord, user_id)
        if refreshed is None:
            raise RuntimeError("notification preference was not persisted")
        return self._to_schema(refreshed)

    @staticmethod
    def _to_schema(record: NotificationPreferenceRecord) -> NotificationPreference:
        return NotificationPreference(
            user_id=record.user_id,
            enabled=record.enabled,
            timezone=record.timezone,
            local_time=record.local_time,
            delivery_status=record.delivery_status,
            last_delivery_at=record.last_delivery_at,
        )
