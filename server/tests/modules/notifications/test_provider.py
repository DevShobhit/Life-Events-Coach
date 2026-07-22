import json

import httpx
import pytest
from app.modules.notifications.provider import (
    HttpNotificationProvider,
    NotificationProviderError,
)
from app.modules.notifications.scheduler import NotificationIntent


def intent() -> NotificationIntent:
    from datetime import date

    return NotificationIntent("user-1", date(2026, 7, 21), ("phase-a",), "daily:key")


@pytest.mark.anyio
async def test_http_provider_sends_idempotent_intent_without_logging_payload() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(202)

    provider = HttpNotificationProvider(
        "https://notify.example", token="secret", transport=httpx.MockTransport(handler)
    )
    await provider.send(intent())

    assert requests[0].headers["Authorization"] == "Bearer secret"
    assert json.loads(requests[0].content)["dedupe_key"] == "daily:key"


@pytest.mark.anyio
async def test_http_provider_classifies_retryable_and_permanent_responses() -> None:
    retryable = HttpNotificationProvider(
        "https://notify.example", transport=httpx.MockTransport(lambda _: httpx.Response(503))
    )
    with pytest.raises(NotificationProviderError) as retry_error:
        await retryable.send(intent())
    assert retry_error.value.retryable is True

    permanent = HttpNotificationProvider(
        "https://notify.example", transport=httpx.MockTransport(lambda _: httpx.Response(400))
    )
    with pytest.raises(NotificationProviderError) as permanent_error:
        await permanent.send(intent())
    assert permanent_error.value.retryable is False
