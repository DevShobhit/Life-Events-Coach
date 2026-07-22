from datetime import UTC, datetime

import pytest
from app.modules.notifications.service import NotificationScheduleReport
from app.modules.notifications.worker import NotificationDeliveryReport
from app.scripts import notification_cycle


class SessionContext:
    async def __aenter__(self):
        return "session"

    async def __aexit__(self, *args):
        return None


def session_factory():
    return SessionContext()


@pytest.mark.anyio
async def test_cycle_runner_returns_safe_aggregate_report(monkeypatch):
    async def fake_cycle(session, provider, *, now):
        assert session == "session"
        assert provider == "provider"
        assert now == datetime(2026, 7, 21, 9, tzinfo=UTC)
        return (
            NotificationScheduleReport(1, 1, 0),
            NotificationDeliveryReport(1, 1, 0, 0),
        )

    monkeypatch.setattr(notification_cycle, "run_notification_cycle", fake_cycle)
    result = await notification_cycle.run_cycle(
        session_factory, provider="provider", now=datetime(2026, 7, 21, 9, tzinfo=UTC)
    )

    assert result == {
        "considered": 1,
        "scheduled": 1,
        "claimed": 1,
        "sent": 1,
        "retryable": 0,
        "failed": 0,
    }
