"""Opt-in approved-source provider readiness smoke with safe output."""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any

import httpx


async def run_provider_smoke(
    *,
    base_url: str,
    timeout_seconds: float = 5.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            transport=transport,
        ) as client:
            health = await client.get("/health")
            retrieve = await client.post(
                "/retrieve",
                json={
                    "phase_id": "smoke-test",
                    "question": "synthetic provider smoke question",
                    "max_results": 1,
                },
            )
    except httpx.HTTPError:
        return {
            "kind": "grounding_provider_smoke",
            "health_status": 599,
            "retrieve_status": 599,
            "source_count": 0,
            "ok": False,
        }
    payload: object = retrieve.json() if retrieve.is_success else {}
    sources = payload.get("sources", []) if isinstance(payload, dict) else []
    return {
        "kind": "grounding_provider_smoke",
        "health_status": health.status_code,
        "retrieve_status": retrieve.status_code,
        "source_count": len(sources) if isinstance(sources, list) else 0,
        "ok": health.is_success and retrieve.is_success and isinstance(sources, list),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    result = asyncio.run(run_provider_smoke(base_url=args.base_url))
    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
