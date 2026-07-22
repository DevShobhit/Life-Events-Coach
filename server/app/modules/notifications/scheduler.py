from dataclasses import dataclass
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from app.modules.notifications.preferences import NotificationPreference


@dataclass(frozen=True)
class DailyNotificationDecision:
    should_send: bool
    reason: str


@dataclass(frozen=True)
class NotificationIntent:
    """Provider-neutral, idempotent delivery intent.

    Delivery remains outside the API process; this value is the seam a future
    worker or adapter can consume without changing scheduling rules.
    """

    user_id: str
    local_day: date
    phase_ids: tuple[str, ...]
    dedupe_key: str
    reason: str = "due"


def build_daily_intent(
    preference: NotificationPreference,
    *,
    now: datetime,
    phase_ids: list[str] | tuple[str, ...],
    completed_today: bool,
) -> NotificationIntent | None:
    """Return one consolidated daily intent, or ``None`` when suppressed."""
    decision = daily_notification_decision(
        preference, now=now, completed_today=completed_today
    )
    if not decision.should_send:
        return None
    local_day_value = local_date(now, preference.timezone)
    ordered_phases = tuple(sorted(set(phase_ids)))
    if not ordered_phases:
        return None
    return NotificationIntent(
        user_id=preference.user_id,
        local_day=local_day_value,
        phase_ids=ordered_phases,
        dedupe_key=f"daily:{preference.user_id}:{local_day_value.isoformat()}",
    )


def daily_notification_decision(
    preference: NotificationPreference,
    *,
    now: datetime,
    completed_today: bool,
) -> DailyNotificationDecision:
    if not preference.enabled:
        return DailyNotificationDecision(False, "disabled")
    local_now = now.astimezone(ZoneInfo(preference.timezone))
    if local_now.time().replace(tzinfo=None) < preference.local_time:
        return DailyNotificationDecision(False, "before_local_delivery_time")
    if completed_today:
        return DailyNotificationDecision(False, "completed_today")
    if preference.delivery_status == "sent" and preference.last_delivery_at:
        delivered_at = preference.last_delivery_at
        if delivered_at.tzinfo is None:
            delivered_at = delivered_at.replace(tzinfo=UTC)
        delivered_local_date = delivered_at.astimezone(
            ZoneInfo(preference.timezone)
        ).date()
        if delivered_local_date == local_now.date():
            return DailyNotificationDecision(False, "already_delivered_today")
    return DailyNotificationDecision(True, "due")


def local_date(now: datetime, timezone_name: str) -> date:
    return now.astimezone(ZoneInfo(timezone_name)).date()
