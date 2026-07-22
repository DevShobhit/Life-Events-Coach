# API/UI Contract Matrix

This is the Phase 0 contract baseline for the relocation MVP. The browser
client consumes only the contracts listed here; unsupported mockup controls
remain deferred.

| UI surface | Read/write contract | Required request data | UI success | UI failure/recovery |
| --- | --- | --- | --- | --- |
| Onboarding catalog | `GET /phases` | none | Published phase IDs and configured field names | Loading, retry, empty catalog |
| Enrollment | `PUT /enrollment/{user}/{phase}` | `X-User-ID`, context, progress anchor | Persisted enrollment, replace route with `/now` | Inline validation or safe retry |
| Now | `GET /roadmap/{user}/{phase}` | `X-User-ID`, stage | Current card and queue | Cached data, retryable error, setup state |
| Card action | `POST /roadmap/{user}/{phase}/actions` | `X-User-ID`, concern, action, stage, idempotency key | Authoritative resequenced roadmap | Optimistic rollback or safe offline replay |
| Horizon | Roadmap read above | same as Now | Grouped read-only future cards | Retry, empty state, confirmed removal |
| Ask | `POST /ask/{user}/{phase}` | `X-User-ID`, 1–500 character question | Answer mode, citations, optional proposal | Retry, no-answer, timeout recovery |
| Roadmap fold | `POST /ask/{user}/{phase}/roadmap-folds/{concern}` | `X-User-ID`, confirmation, stage, idempotency key | Fresh roadmap | Confirmed action failure |
| Settings context | `GET/PUT /enrollment/{user}/{phase}` | `X-User-ID`, supported context | Refreshed roadmap queries | Friendly validation/retry |

## Stable error mapping

| API code | HTTP | Client behavior |
| --- | --- | --- |
| `bad_request` | 400 | Show correction guidance; do not queue |
| `validation_error` | 422 | Show field or request validation; do not queue |
| `forbidden` | 403 | Show session/access recovery; do not queue |
| `not_found` | 404 | Show setup/refresh recovery; do not queue |
| `dependency_unavailable` | 503 | Retry reads; queue only eligible idempotent actions |
| `gateway_timeout` | 504 | Retry Ask/read as appropriate; show source timeout |
| `internal_error`/`http_error` | 500+ | Safe retryable error; never expose raw server text |

Every response carries `X-Request-ID`. Logs may include request ID, route
template, status, and duration, but never user IDs, questions, request bodies,
tokens, or protected context.

Catalog, module detail, roadmap, and Ask all use the same active persisted phase
version. Roadmap cards carry body/visual and citation display metadata. Saved
enrollment context and progression anchor drive roadmap operations; client
`stage` remains a compatibility input only during migration.

## Deferred contracts

Authentication, notification persistence/delivery, concurrent phases,
archive/history, export/delete, editorial mutation APIs, resource browsing,
and profile avatars are not implemented until their server contracts exist.
