import asyncio

import httpx
from app.scripts.grounding_provider_smoke import run_provider_smoke


def test_provider_smoke_reports_only_safe_status_metadata() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200)
        return httpx.Response(200, json={"sources": [{"citation": {"id": "safe"}}]})

    result = asyncio.run(
        run_provider_smoke(
            base_url="https://provider.example",
            transport=httpx.MockTransport(handler),
        )
    )

    assert result == {
        "kind": "grounding_provider_smoke",
        "health_status": 200,
        "retrieve_status": 200,
        "source_count": 1,
        "ok": True,
    }
    assert "question" not in result


def test_provider_smoke_reports_transport_failure_without_payloads() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("provider unavailable", request=request)

    result = asyncio.run(
        run_provider_smoke(
            base_url="https://provider.example",
            transport=httpx.MockTransport(handler),
        )
    )

    assert result == {
        "kind": "grounding_provider_smoke",
        "health_status": 599,
        "retrieve_status": 599,
        "source_count": 0,
        "ok": False,
    }
