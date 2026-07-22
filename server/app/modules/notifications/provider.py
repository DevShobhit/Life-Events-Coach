import httpx

from app.core.settings import Settings, get_settings
from app.modules.notifications.scheduler import NotificationIntent


class NotificationProviderError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool) -> None:
        super().__init__(message)
        self.retryable = retryable


class HttpNotificationProvider:
    """Send provider-neutral intents to a configured notification gateway."""

    def __init__(
        self,
        base_url: str,
        *,
        token: str | None = None,
        timeout_seconds: float = 2.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not base_url.strip():
            raise ValueError("notification provider URL must not be empty")
        if timeout_seconds <= 0:
            raise ValueError("notification provider timeout must be positive")
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._timeout = httpx.Timeout(timeout_seconds)
        self._transport = transport

    async def send(self, intent: NotificationIntent) -> None:
        payload = {
            "user_id": intent.user_id,
            "local_day": intent.local_day.isoformat(),
            "phase_ids": list(intent.phase_ids),
            "dedupe_key": intent.dedupe_key,
            "reason": intent.reason,
        }
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout, transport=self._transport
            ) as client:
                response = await client.post(
                    f"{self._base_url}/notifications", json=payload, headers=headers
                )
        except (httpx.TimeoutException, httpx.TransportError) as error:
            raise NotificationProviderError(
                "notification provider transport failed", retryable=True
            ) from error
        if 200 <= response.status_code < 300:
            return
        raise NotificationProviderError(
            "notification provider rejected delivery",
            retryable=response.status_code == 429 or response.status_code >= 500,
        )


def configured_notification_provider(
    settings: Settings | None = None,
) -> HttpNotificationProvider | None:
    selected = settings or get_settings()
    if selected.notification_provider_url is None:
        return None
    return HttpNotificationProvider(
        str(selected.notification_provider_url),
        token=selected.notification_provider_token,
        timeout_seconds=selected.notification_provider_timeout_seconds,
    )
