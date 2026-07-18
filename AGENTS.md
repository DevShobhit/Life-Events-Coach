# Repository Guidelines

## Project Structure & Module Organization

- `ui/` contains the Next.js 16 frontend: routes in `ui/app/`, reusable primitives in `ui/components/ui/`, and shared helpers in `ui/lib/`.
- `server/` is the FastAPI backend. Cross-cutting code belongs in `server/app/core/`; add product modules under `server/app/modules/<domain>/` only when a feature exists. Tests live in `server/tests/`.
- `infra/otel/` holds local OpenTelemetry Collector configuration. `compose.yaml` starts the backend and collector. Product and engineering decisions live under `docs/`.

## Build, Test, and Development Commands

Frontend, from `ui/`:

```powershell
npm run dev       # Next.js development server
npm run lint      # Biome checks
npm run build     # production build
```

Backend, from `server/` after activating `.venv`:

```powershell
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
uv run pytest tests -p no:cacheprovider
uv run ruff check app tests; uv run black --check app tests; uv run mypy
```

Use `docker compose up --build` at the repository root to start the API and local telemetry collector.

## Coding Style & Naming Conventions

Use TypeScript `camelCase` values and `PascalCase` React components/types. Use Python `snake_case` modules/functions and `PascalCase` classes. Keep route handlers thin; place configuration, logging, and telemetry in `server/app/core/`. Format Python with Black and lint with Ruff; do not hand-edit `server/pyproject.toml` for dependencies—use `uv add` or `uv remove`.

Read `ui/AGENTS.md` before frontend work: this Next.js version has breaking changes, so consult its installed documentation before using unfamiliar APIs.

## Testing Guidelines

Write a failing test before behavior changes. Name tests `test_<expected_behavior>()`; test API outcomes rather than internal calls. Cover success, invalid input, and authorization/error paths where applicable. Run the focused test, then the full backend quality commands before requesting review.

## Security & Configuration

Keep secrets in ignored `.env` files or deployment secret stores; commit only `.env.example`. Validate all external input at API boundaries. Never log tokens, personal profile data, request bodies, or raw user questions. Preserve `X-Request-ID`, structured logs, and trace propagation in new API paths.

## Commit & Pull Request Guidelines

Existing history uses short descriptive summaries and has no fixed prefix convention. Use focused imperative messages, preferably `feat:`, `fix:`, `docs:`, or `chore:`. Keep each commit to one concern. PRs should state scope, verification commands/results, configuration changes, and linked issues; include screenshots for UI changes and trace/log evidence for operational changes.
