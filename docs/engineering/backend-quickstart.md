# Backend Quickstart

## Prerequisites

- Windows PowerShell
- Python 3.13
- `uv`
- Docker Desktop for PostgreSQL/telemetry runs

## Fastest local API loop

```powershell
cd server
Copy-Item .env.example .env
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs`. Liveness works without a database;
readiness requires a reachable database and current migrations.

## Full local stack

```powershell
docker compose up --build
```

Compose starts PostgreSQL, applies repeatable migrations before Uvicorn,
starts the API, and starts the local OpenTelemetry Collector. Stop with
`Ctrl+C`; remove only disposable local state with `docker compose down`.

## First API smoke

```powershell
$headers = @{ "X-User-ID" = "local-dev-user" }
Invoke-RestMethod http://localhost:8000/health/live
Invoke-RestMethod http://localhost:8000/health/ready
Invoke-RestMethod http://localhost:8000/phases
Invoke-RestMethod "http://localhost:8000/roadmap/local-dev-user/relocation?stage=arrived" -Headers $headers
```

The current `X-User-ID` header is a development scope boundary, not
authentication. Never use it as production identity.

## Test-first loop

```powershell
cd server
uv run pytest tests/modules/phases/test_<feature>.py -p no:cacheprovider
uv run pytest tests -p no:cacheprovider
uv run ruff check app tests
uv run black --check app tests
uv run mypy
```

Run focused tests first. Run the full suite before handoff. PostgreSQL
concurrency coverage is opt-in:

```powershell
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/lifecurriculum"
uv run pytest tests/modules/phases/test_action_repository_postgres.py -p no:cacheprovider
```

## Common failures

| Symptom | Check |
| --- | --- |
| `/health/ready` returns 503 | PostgreSQL is running; `DATABASE_URL`; migrations applied. |
| `/phases` returns 503 | Active module seed exists in database. |
| Browser CORS failure | UI origin is in development CORS policy; request includes only supported headers. |
| Metrics returns 403 | Production requires `X-Metrics-Token` matching `METRICS_ACCESS_TOKEN`. |
| Action replay changes state twice | Reuse same idempotency key; differing payload must be rejected. |

## Safe debugging

Use request ID, route template, status, duration, trace ID, and span ID. Never
print user IDs, enrollment context, request bodies, raw Ask questions, tokens,
or full card payloads.
