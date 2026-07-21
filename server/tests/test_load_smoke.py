from app.scripts.api_load_smoke import summarize_results


def test_load_summary_reports_success_rate_and_percentiles() -> None:
    summary = summarize_results(
        [
            {"status": 200, "duration_ms": 10.0},
            {"status": 200, "duration_ms": 20.0},
            {"status": 503, "duration_ms": 30.0},
        ]
    )

    assert summary["requests"] == 3
    assert summary["successful"] == 2
    assert summary["failed"] == 1
    assert summary["error_rate"] == 1 / 3
    assert summary["p50_ms"] == 20.0
    assert summary["p95_ms"] == 30.0


def test_load_summary_handles_empty_results() -> None:
    summary = summarize_results([])

    assert summary == {
        "requests": 0,
        "successful": 0,
        "failed": 0,
        "error_rate": 0.0,
        "p50_ms": 0.0,
        "p95_ms": 0.0,
    }
