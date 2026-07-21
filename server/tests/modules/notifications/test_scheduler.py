from datetime import UTC, datetime, time

from app.modules.notifications.preferences import NotificationPreference
from app.modules.notifications.scheduler import daily_notification_decision


def preference(**overrides: object) -> NotificationPreference:
    values: dict[str, object] = {
        "user_id": "user-1",
        "enabled": True,
        "timezone": "Asia/Kolkata",
        "local_time": time(9, 0),
        "delivery_status": "not_configured",
        "last_delivery_at": None,
    }
    values.update(overrides)
    return NotificationPreference.model_validate(values)


def test_daily_notification_is_due_after_local_delivery_time() -> None:
    decision = daily_notification_decision(
        preference(),
        now=datetime(2026, 7, 21, 4, 0, tzinfo=UTC),
        completed_today=False,
    )

    assert decision.should_send is True
    assert decision.reason == "due"


def test_daily_notification_respects_local_time_and_suppresses_completion() -> None:
    before_time = daily_notification_decision(
        preference(),
        now=datetime(2026, 7, 21, 2, 59, tzinfo=UTC),
        completed_today=False,
    )
    completed = daily_notification_decision(
        preference(),
        now=datetime(2026, 7, 21, 4, 0, tzinfo=UTC),
        completed_today=True,
    )

    assert before_time.reason == "before_local_delivery_time"
    assert before_time.should_send is False
    assert completed.reason == "completed_today"
    assert completed.should_send is False


def test_daily_notification_suppresses_duplicate_local_day_delivery() -> None:
    decision = daily_notification_decision(
        preference(
            last_delivery_at=datetime(2026, 7, 20, 23, 0, tzinfo=UTC),
            delivery_status="sent",
        ),
        now=datetime(2026, 7, 21, 4, 0, tzinfo=UTC),
        completed_today=False,
    )

    assert decision.should_send is False
    assert decision.reason == "already_delivered_today"
