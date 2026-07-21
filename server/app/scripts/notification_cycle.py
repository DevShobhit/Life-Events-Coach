"""Explicit deployment/cron runner for notification scheduling and delivery."""

from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Callable
from datetime import UTC, datetime

from app.core.database import session_factory
from app.core.settings import get_settings
from app.modules.notifications.provider import configured_notification_provider
from app.modules.notifications.worker import run_notification_cycle


async def run_cycle(
    session_factory_value: Callable[[], object],
    *,
    provider: object,
    now: datetime | None = None,
) -> dict[str, int]:
    async with session_factory_value() as session:  # type: ignore[attr-defined]
        schedule, delivery = await run_notification_cycle(
            session, provider, now=now
        )
    return {
        "considered": schedule.considered,
        "scheduled": schedule.scheduled,
        "claimed": delivery.claimed,
        "sent": delivery.sent,
        "retryable": delivery.retryable,
        "failed": delivery.failed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--now", help="UTC ISO timestamp for deterministic runs")
    args = parser.parse_args()
    provider = configured_notification_provider(get_settings())
    if provider is None:
        print(json.dumps({"status": "disabled", "reason": "provider_not_configured"}))
        return 0
    now = datetime.fromisoformat(args.now).astimezone(UTC) if args.now else None
    result = asyncio.run(run_cycle(session_factory, provider=provider, now=now))
    print(json.dumps({"status": "completed", **result}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
