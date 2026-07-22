"""Opt-in approved-source provider readiness smoke with safe output."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from typing import Any

import httpx


async def run_provider_smoke(
    *,
    base_url: str,
    token: str | None = None,
    timeout_seconds: float = 5.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            transport=transport,
        ) as client:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            health = await client.get("/health", headers=headers)
            retrieve = await client.post(
                "/retrieve",
                json={
                    "phase_id": "smoke-test",
                    "question": "synthetic provider smoke question",
                    "max_results": 1,
                },
                headers=headers,
            )
    except httpx.HTTPError:
        return {
            "kind": "grounding_provider_smoke",
            "health_status": 599,
            "retrieve_status": 599,
            "source_count": 0,
            "ok": False,
        }
    try:
        payload: object = retrieve.json() if retrieve.is_success else {}
    except ValueError:
        payload = {}
    valid_payload = isinstance(payload, dict) and isinstance(
        payload.get("sources"), list
    )
    sources = payload["sources"] if valid_payload else []
    return {
        "kind": "grounding_provider_smoke",
        "health_status": health.status_code,
        "retrieve_status": retrieve.status_code,
        "source_count": len(sources) if isinstance(sources, list) else 0,
        "ok": (
            health.is_success
            and retrieve.is_success
            and valid_payload
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument(
        "--token-env",
        default="GROUNDING_PROVIDER_TOKEN",
        help="environment variable containing a provider token; never printed",
    )
    args = parser.parse_args()
    result = asyncio.run(
        run_provider_smoke(
            base_url=args.base_url, token=os.environ.get(args.token_env)
        )
    )
    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
