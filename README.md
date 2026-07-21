# LiveCoach

LiveCoach is a just-in-time guidance platform for major life transitions. The initial product phase is a hand-curated relocation corridor; its PRD and engineering plan are in [`docs/_internal`](docs/_internal/).

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

## Built with Codex

LiveCoach was developed as a close collaboration with Codex, powered by GPT-5.6. Codex GPT 5.6 Terra model with high reasoning was used to generate plans with granular tasks and Codex GPT 5.6 Luna light model was used for code generation. We set the product direction: a just-in-time guide for major life transitions, starting with a relocation corridor; chose the user experience and visual direction; and made the key calls on scope, priorities, trade-offs, and what was ready to ship.

Codex accelerated the workflow by turning those decisions into small, reviewable implementation slices across the Next.js frontend and FastAPI backend. It helped explore the existing codebase, draft and refine contracts, implement features and safeguards, write focused regression coverage, run quality checks, and keep supporting documentation and engineering records current. GPT-5.6 was especially useful for synthesizing product requirements into concrete technical work, reasoning through edge cases, and iterating rapidly on copy, UI, architecture, and verification evidence.

Codex proposed options, surfaced risks, and handled much of the repetitive engineering work, while we retained ownership of the product, engineering, and design decisions.

## Developer guides

- [Backend quickstart](docs/engineering/backend-quickstart.md)
- [Backend code guidelines](docs/engineering/backend-guidelines.md)
- [Repository conventions](docs/engineering/repo-conventions.md)
- [Backend architecture and flows](docs/_internal/diagrams/backend-architecture.md)
- [Backend data contracts](docs/_internal/data-contracts.md)
- [API/UI contract matrix](docs/api-ui-contract-matrix.md)
