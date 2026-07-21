# Repository Conventions

## Top-level ownership

| Path | Ownership |
| --- | --- |
| `ui/` | Next.js frontend; routes in `ui/app`, features in `ui/features`. |
| `server/` | FastAPI backend; domain modules under `server/app/modules`. |
| `infra/otel/` | Local OpenTelemetry Collector configuration only. |
| `docs/_internal/` | PRD, specs, architecture, contracts, diagrams. |
| `docs/engineering/` | Quickstarts, coding rules, runbooks, developer workflow. |
| `_plans/` | Implementation plans; never source of runtime behavior. |
| `_tasks/` | Checklists and task status. |
| `_agent_logs/` | Append-only work evidence and subagent ledger. |

## Before editing

1. Read root `AGENTS.md` and relevant `ui/AGENTS.md`.
2. Find the governing PRD/spec and current API/data contract.
3. Search existing code/tests with `rg`; reuse existing patterns.
4. Identify protected data and affected docs/diagrams.
5. Write a focused failing test for behavior changes.

## During editing

- Keep one vertical slice small enough for one focused session.
- Do not invent fields, endpoints, or persistence in the UI.
- Do not add abstractions until two real callers need them (YAGNI).
- Keep route files thin and shared primitives focused.
- Preserve unrelated dirty worktree changes.
- Use `apply_patch` for file edits.

## Before commit

```powershell
git diff --check
git diff --staged
cd server
uv run pytest tests -p no:cacheprovider
uv run ruff check app tests
uv run black --check app tests
uv run mypy
```

Stage explicit paths. Do not stage `.env`, generated output, dependency
folders, or unrelated existing changes. Docs/tasks/logs stay separate when
requested.

## Commit and review

Use focused imperative commits. PR description must state scope, tests,
configuration changes, docs impact, and known limitations. Review API changes
against `docs/api-ui-contract-matrix.md` and update diagrams for state/flow
changes.

## Done means

- Acceptance criteria pass.
- Focused and full quality checks pass.
- Protected data remains absent from logs/errors/metrics.
- Required docs, diagrams, task status, and agent log are updated.
- Reviewer can reproduce quickstart from a clean environment.
