# AI Developer Guidelines

## Operating rule

Prefer the smallest change that meets an approved task. YAGNI means do not build an abstraction, option, or integration for an imagined future use; it does not mean ignore an explicit PRD requirement. KISS means a junior developer can explain the control flow and test it without knowing hidden conventions.

## Before changing code

1. Read the applicable PRD requirements, this guide, nearest `AGENTS.md`, and the files/tests you will change.
2. State the task ID, in-scope files, assumptions, risk level, and verification command in the central progress update.
3. Reuse an existing project pattern before adding a library, framework layer, hook, base class, or service abstraction.
4. Stop and request approval before changing authentication, authorization, CORS, data classification, database retention, external integrations, or production deployment.

## Naming and module rules

- Use clear domain names: `phase_module`, `concern`, `roadmap`, `card_action`; never `data`, `utils`, `manager`, or `helpers` as a catch-all.
- TypeScript: `camelCase` functions/variables, `PascalCase` components/types, `kebab-case` route folders, and suffix schemas with `Schema`.
- Python: `snake_case` functions/modules, `PascalCase` classes, `UPPER_SNAKE_CASE` constants; use verbs for actions and nouns for values.
- One module has one purpose. Routes translate HTTP only; services own use-case orchestration; repositories own persistence; schemas validate external boundaries. Do not create layers until the first use case needs them.
- Keep files under approximately 300 lines and functions under approximately 50 lines. Split by responsibility, not merely to meet a number. Document exceptions in the progress update.
- Do not create a generic `BaseService`, global singleton, or inheritance tree without two real implementations with the same stable contract.

## Frontend rules

- Default to Server Components; use client components only for browser APIs, event handlers, or client state.
- Treat `NEXT_PUBLIC_*` as public. Never put secrets, internal URLs, or sensitive profile information there.
- Validate external data at the UI/API boundary; render user content as text by default. Avoid raw HTML; sanitize only when rendering vetted rich content is an approved feature.
- Keep route files focused on composition. Put reusable, domain-owned behavior under `features/<feature>/` once a feature exists; keep truly generic primitives under `components/ui/`.
- Prevent memory leaks: clean up event listeners, timers, observers, subscriptions, and abort in-flight requests on unmount. Avoid unbounded client caches and object URLs without revocation.
- Measure before optimizing. Prevent unnecessary client-side fetching, N+1 browser requests, oversized images, and avoidable client bundles; do not add memoization blindly.

## Backend rules

- Validate every request, environment setting, webhook, and third-party response at its boundary. Return stable error codes, not implementation details.
- Make database access parameterized through the chosen driver/ORM. Every protected object access must verify ownership/authorization, not just authentication.
- Make retries explicit: retry only idempotent operations, with bounded exponential backoff and a timeout. Every remote call needs a timeout.
- Keep request handlers non-blocking. Do not run CPU-heavy or long-running work in request paths; introduce a worker only when a confirmed use case requires it.
- Control resources: bound input sizes, pagination limits, connection pools, concurrency, queues, uploads, and response sizes. Close files, HTTP clients, database sessions, and streams deterministically.
- Never log prompts, answers, profile fields, credentials, cookies, authorization headers, raw user questions, or full database records. Redact before logging.

## Security baseline

- Threat-model each new boundary: assets, trust boundary, abuse cases, authorization, resource exhaustion, SSRF, and sensitive-data exposure.
- Keep secrets out of Git, images, logs, client bundles, build arguments, and error messages. Use managed secret injection in deployment; `.env.example` contains names and safe placeholders only.
- Use TLS in deployed environments; secure headers and a restrictive CORS allowlist are configured before public APIs exist.
- Apply least privilege to users, database roles, CI tokens, containers, and cloud identities. Containers should not run as root or require privileged mode.
- Pin and review dependencies through the committed lockfile. Run the ecosystem audit; resolve reachable critical/high findings before release or record a time-bounded exception.
- Future LLM features must treat model output as untrusted: never pass it directly to SQL, shell, HTML, URLs, authorization decisions, or tools.

## Testing and quality

- Test behavior, not private implementation details. Cover happy path, invalid input, authorization/ownership, error path, and the PRD edge case for every feature.
- Unit test pure domain rules; integration test API + database boundaries; run one browser-level test only for critical cross-layer flows. Avoid tests that only assert mocks were called.
- Each bug fix includes a regression test that fails before the fix. Use deterministic clocks, seeded fixtures, and isolated test data.
- Required before handoff: formatter, lint, typecheck, relevant tests, container build if changed, and manual health/trace check for operational changes.
- Do not weaken a test, disable a linter, or raise a timeout just to make a change pass without recording why and receiving review.

## Observability and performance

- Start a trace for each request; propagate trace context across UI → API and future jobs. Add spans around external dependencies, not every function.
- Log events with structured fields and correlation IDs. Log once at the layer that handles an error; do not emit duplicate stack traces at every layer.
- Metrics use low-cardinality dimensions only. Define an SLI and failure mode before adding an alert.
- Establish a baseline before performance work. Optimize the measured bottleneck, add a regression measurement, and keep the change if it improves the stated target.

## Central progress update

For every task, update the pull request/task tracker at start, after any scope/risk change, and at completion using:

```markdown
Task: T-## — <title>
Status: not started | in progress | blocked | ready for review | done
Scope: <files/behavior>
Evidence: <commands, screenshots, trace ID, test result>
Risks/decisions: <or none>
Next: <one concrete action>
```

Do not claim a task is complete without evidence. Escalate blockers rather than silently expanding scope.

## Review checklist

- Is the change the smallest clear implementation of the approved task?
- Are identifiers and data classifications explicit?
- Are new inputs validated and sensitive values excluded from logs/client code?
- Are resource lifecycles bounded and cleaned up?
- Are required tests and operational checks evidenced?
- Does the PRD still map to one clear owner/module, without a speculative abstraction?

## Sources

- [OWASP API Security Top 10](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/)
- [NIST SSDF](https://csrc.nist.gov/projects/ssdf)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables)
