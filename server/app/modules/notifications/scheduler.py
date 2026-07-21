from dataclasses import dataclass
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from app.modules.notifications.preferences import NotificationPreference


@dataclass(frozen=True)
class DailyNotificationDecision:
    should_send: bool
    reason: str


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
