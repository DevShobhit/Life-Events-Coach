# LifeCurriculum API

FastAPI backend for the LifeCurriculum phased curriculum. It provides phase-scoped Ask and roadmap APIs, async ORM persistence, and operational telemetry; authentication remains represented by the current `X-User-ID` scope boundary.

## Local setup

The project uses the committed `uv.lock` file and a local `.venv`.

```powershell
cd server
.\.venv\Scripts\Activate.ps1
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the generated API documentation.

## Operational endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health/live` | Process liveness; it does not query dependencies. |
| `GET /health/ready` | Readiness. It is intentionally identical to liveness until a real dependency is added. |
| `GET /metrics` | Prometheus text-format request count and latency metrics. Keep this endpoint private in a deployed environment. |
| `POST /ask/{user_id}/{phase_id}` | Curated-first, citation-grounded Ask response with an explicit roadmap proposal. |
| `POST /ask/{user_id}/{phase_id}/roadmap-folds/{concern_id}` | Confirm a proposed roadmap fold; requires `confirm: true` and an idempotency key. |
| `GET /roadmap/{user_id}/{phase_id}` | Persisted Now/Horizon roadmap. |
| `GET /editorial/freshness/{phase_id}` | Read-only citation freshness report; accepts optional `as_of`. |

Every API response carries an `X-Request-ID`. The server emits one JSON log event per completed request with that request ID and records OpenTelemetry traces. Do not add user data, authorization headers, request bodies, or raw questions to logs, spans, or metric labels.

Ask never mutates roadmap progress. A grounded response may include a
`roadmap_proposal`; only the separate confirmation endpoint records the
explicit fold through the async ORM action repository. Errors use the stable
`error` envelope documented in `docs/data-contracts.md`.

## Configuration

Copy `.env.example` to `.env` only for local values. `.env` is ignored by Git. Configuration is validated by `app.core.settings` and is read only there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | Valid values: `development`, `test`, `production`. |
| `LOG_LEVEL` | `INFO` | Valid values: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Optional OTLP/HTTP collector base URL. |

## Quality commands

```powershell
cd server
.\.venv\Scripts\Activate.ps1
uv run pytest tests -p no:cacheprovider
uv run ruff check app tests
uv run black --check app tests
uv run mypy
```

`pytest` is deliberately scoped to `tests` because the local environment may contain tool-created temporary directories that are not test suites.

## Containers and telemetry

From the repository root:

```powershell
docker compose up --build
```

The API runs as a non-root user. Local compose uses PostgreSQL 18 and the
OpenTelemetry Collector `latest` image, which accepts OTLP/HTTP on port 4318
and writes trace summaries to its container log. The floating collector tag is
for local development only; pin and secure a hosted telemetry backend before
deployment. See `docs/operations/relocation-mvp-runbook.md` for the synthetic
vertical slice.
