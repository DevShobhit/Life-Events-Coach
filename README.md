# LifeCurriculum

LifeCurriculum is a just-in-time guidance platform for major life transitions. The initial product phase is a hand-curated relocation corridor; its PRD and engineering plan are in [`docs/_internal`](docs/_internal/).

## Workspace

- [`ui/`](ui/) — Next.js application.
- [`server/`](server/) — FastAPI backend foundation, including structured logs, OpenTelemetry tracing, and Prometheus metrics.
- [`infra/otel/`](infra/otel/) — local OpenTelemetry Collector configuration.
- [`docs/engineering/`](docs/engineering/) — engineering and AI-developer guidance.

## Start the backend foundation

```powershell
cd server
.\.venv\Scripts\Activate.ps1
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
```

Or start the containerized API and local telemetry collector:

```powershell
docker compose up --build
```

See the [backend README](server/README.md) for configuration, health endpoints, telemetry, and quality commands.
