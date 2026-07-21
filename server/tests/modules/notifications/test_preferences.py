from collections.abc import AsyncGenerator
from datetime import time

import pytest
from app.modules.notifications.preferences import (
    NotificationPreference,
    NotificationPreferenceRepository,
    NotificationPreferenceUpdate,
)
from app.modules.phases.orm_models import Base
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as database_session:
        yield database_session
    await engine.dispose()


def test_notification_update_validates_iana_timezone_and_local_time() -> None:
    preference = NotificationPreferenceUpdate(
        enabled=True,
        timezone="Asia/Kolkata",
        local_time=time(8, 30),
    )

    assert preference.timezone == "Asia/Kolkata"
    assert preference.local_time == time(8, 30)

    with pytest.raises(ValidationError):
        NotificationPreferenceUpdate(
            enabled=True,
            timezone="not/a-timezone",
            local_time=time(8, 30),
        )


def test_notification_update_does_not_accept_server_delivery_fields() -> None:
    with pytest.raises(ValidationError):
        NotificationPreferenceUpdate.model_validate(
            {
                "enabled": True,
                "timezone": "UTC",
                "local_time": "08:30:00",
                "delivery_status": "sent",
            }
        )


@pytest.mark.anyio
async def test_notification_preferences_upsert_and_read_are_subject_scoped(
    session: AsyncSession,
) -> None:
    repository = NotificationPreferenceRepository(session)
    update = NotificationPreferenceUpdate(
        enabled=True,
        timezone="UTC",
        local_time=time(9, 0),
    )

    created = await repository.upsert("user-1", update)
    assert created == NotificationPreference(
        user_id="user-1",
        enabled=True,
        timezone="UTC",
        local_time=time(9, 0),
        delivery_status="not_configured",
        last_delivery_at=None,
    )

    updated = await repository.upsert(
        "user-1",
        update.model_copy(update={"enabled": False, "timezone": "Europe/London"}),
    )
    assert updated.enabled is False
    assert updated.delivery_status == "not_configured"
    assert await repository.get("user-2") is None
