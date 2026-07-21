from collections.abc import AsyncIterator

from app.core.database import get_session
from app.main import app
from app.modules.phases.orm_models import Base
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

notification_engine = None


async def override_notification_session() -> AsyncIterator[AsyncSession]:
    global notification_engine
    if notification_engine is None:
        notification_engine = create_async_engine("sqlite+aiosqlite://")
    async with notification_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(notification_engine, expire_on_commit=False)
    async with factory() as session:
        yield session


def test_notification_preferences_default_and_upsert_are_subject_scoped() -> None:
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_notification_session
    try:
        with TestClient(app) as client:
            default = client.get(
                "/notifications/preferences/notify-user",
                headers={"X-User-ID": "notify-user"},
            )
            saved = client.put(
                "/notifications/preferences/notify-user",
                json={"enabled": True, "timezone": "Asia/Kolkata", "local_time": "08:30:00"},
                headers={"X-User-ID": "notify-user"},
            )
            read_back = client.get(
                "/notifications/preferences/notify-user",
                headers={"X-User-ID": "notify-user"},
            )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert default.status_code == 200
    assert default.json()["enabled"] is False
    assert saved.status_code == 200
    assert saved.json()["delivery_status"] == "not_configured"
    assert read_back.json()["timezone"] == "Asia/Kolkata"
    assert read_back.json()["local_time"] == "08:30:00"


def test_notification_preferences_reject_invalid_timezone_and_mismatched_subject() -> None:
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_notification_session
    try:
        with TestClient(app) as client:
            invalid = client.put(
                "/notifications/preferences/notify-user",
                json={"enabled": True, "timezone": "not/a-zone", "local_time": "08:30:00"},
                headers={"X-User-ID": "notify-user"},
            )
            forbidden = client.get(
                "/notifications/preferences/notify-user",
                headers={"X-User-ID": "other-user"},
            )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert invalid.status_code == 422
    assert forbidden.status_code == 403
