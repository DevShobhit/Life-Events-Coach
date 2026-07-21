"""Opt-in async API load smoke with payload-free JSON output."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from collections.abc import Iterable
from math import ceil
from typing import Any

import httpx


def _percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[max(0, ceil(len(ordered) * fraction) - 1)]


def summarize_results(results: Iterable[dict[str, Any]]) -> dict[str, Any]:
    rows = list(results)
    durations = [float(row["duration_ms"]) for row in rows]
    successful = sum(200 <= int(row["status"]) < 400 for row in rows)
    total = len(rows)
    failed = total - successful
    return {
        "requests": total,
        "successful": successful,
        "failed": failed,
        "error_rate": failed / total if total else 0.0,
        "p50_ms": _percentile(durations, 0.50),
        "p95_ms": _percentile(durations, 0.95),
    }


async def run_load(
    *,
    base_url: str,
    path: str,
    requests: int,
    concurrency: int,
    user_id: str | None = None,
    timeout_seconds: float = 10.0,
) -> list[dict[str, Any]]:
    if requests < 1 or concurrency < 1:
        raise ValueError("requests and concurrency must be positive")
    semaphore = asyncio.Semaphore(concurrency)
    headers = {"X-User-ID": user_id} if user_id else {}

    async with httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout_seconds) as client:
        async def request_once() -> dict[str, Any]:
            async with semaphore:
                started = time.perf_counter()
                try:
                    response = await client.get(path, headers=headers)
                    return {
                        "status": response.status_code,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 3),
                    }
                except httpx.HTTPError:
                    return {
                        "status": 599,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 3),
                    }

        return list(await asyncio.gather(*(request_once() for _ in range(requests))))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--path", default="/health/live")
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--user-id")
    parser.add_argument("--max-p95-ms", type=float, default=0.0)
    args = parser.parse_args()
    results = asyncio.run(
        run_load(
            base_url=args.base_url,
            path=args.path,
            requests=args.requests,
            concurrency=args.concurrency,
            user_id=args.user_id,
        )
    )
    summary = summarize_results(results)
    print(json.dumps({"kind": "api_load_smoke", "path": args.path, **summary}))
    if summary["failed"] or (args.max_p95_ms and summary["p95_ms"] > args.max_p95_ms):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
