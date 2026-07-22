# Backend Code Guidelines

## Boundary ownership

```text
main.py                         HTTP composition, dependencies, error mapping
app/core/                       settings, DB session, logging, telemetry, errors
app/modules/phases/schemas.py   validated data contracts
app/modules/phases/*repository  persistence only; no HTTP concerns
app/modules/phases/*service     domain rules and orchestration
app/modules/phases/roadmap.py   projection/ranking boundary
tests/                          public behavior, not implementation trivia
```

Keep route handlers thin: authenticate/scope, load dependencies, call a domain
service, translate typed errors. Do not put ranking, SQL, or content policy in
routes.

## Naming and typing

- Python modules/functions/variables: `snake_case`.
- Classes and Pydantic models: `PascalCase`.
- Async functions declare `async`; public functions declare return types.
- Prefer domain names (`phase_id`, `concern_id`, `progress_anchor`) over
  generic names (`data`, `item`, `value`).
- Use `StrEnum` for finite API actions/modes.

```python
async def load_active_module(
    session: AsyncSession, phase_id: str
) -> PublishedPhaseModule:
    result = await PhaseModuleRepository(session).get_active_versioned(phase_id)
    if result is None:
        raise NotFoundError("phase")
    version, module = result
    return PublishedPhaseModule(version=version, module=module)
```

## Validation and errors

- Validate external input with Pydantic at HTTP boundaries.
- Validate phase-specific context against the published `PhaseModule` before
  persistence.
- Use stable error codes and safe messages; never expose stack traces, SQL,
  request bodies, or dependency exception text.
- Treat user context and Ask questions as protected data.

## Persistence

- Repository methods receive an injected `AsyncSession`.
- Keep writes inside `session_transaction` or an explicit transaction.
- Use database constraints for uniqueness and terminal-state invariants.
- Idempotency keys are request-bound; exact replay is safe, payload mismatch is
  a conflict.
- Concurrent progress updates require database locking/version checks, not
  process-local locks.
- Published phase content is append-only; new content means a new version.

## Tests

Write failing test first. Test public outcomes:

- Unit tests for pure ranking, lifecycle, validation, and projections.
- Repository tests for transactions, version isolation, and idempotency.
- API tests for success, invalid input, missing setup, scope mismatch, and
  dependency failure.
- Opt-in PostgreSQL tests for behavior SQLite cannot prove.

Avoid tests that only assert a mock was called. Do not add production methods
solely for tests.

## Observability and security

Every response carries `X-Request-ID`; traces may add `X-Trace-ID`. Logs use
bounded route/method/status fields. Never include user IDs, questions, tokens,
context, or arbitrary URLs in metric labels. Settings read environment only in
`app/core/settings.py`.

## Change hygiene

One logical change per commit. Use imperative commit messages:
`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`. Review staged diff
before commit. Keep plans, task checklists, agent logs, and docs out of
implementation commits when the task requests that separation.
