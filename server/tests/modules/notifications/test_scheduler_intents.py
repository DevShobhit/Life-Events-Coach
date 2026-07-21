from datetime import UTC, datetime, time

from app.modules.notifications.preferences import NotificationPreference
from app.modules.notifications.scheduler import build_daily_intent


def preference() -> NotificationPreference:
    return NotificationPreference(
        user_id="user-1", enabled=True, timezone="UTC", local_time=time(9)
    )


def test_build_daily_intent_consolidates_and_deduplicates_phases() -> None:
    intent = build_daily_intent(
        preference(),
        now=datetime(2026, 7, 21, 10, tzinfo=UTC),
        phase_ids=["phase-b", "phase-a", "phase-b"],
        completed_today=False,
    )

    assert intent is not None
    assert intent.phase_ids == ("phase-a", "phase-b")
    assert intent.dedupe_key == "daily:user-1:2026-07-21"


def test_build_daily_intent_suppresses_empty_or_completed_work() -> None:
    now = datetime(2026, 7, 21, 10, tzinfo=UTC)
    assert build_daily_intent(preference(), now=now, phase_ids=[], completed_today=False) is None
    assert (
        build_daily_intent(
            preference(), now=now, phase_ids=["phase-a"], completed_today=True
        )
        is None
    )
