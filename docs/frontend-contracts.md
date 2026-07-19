# Frontend Contract Matrix

This document freezes the supported client boundary for the relocation MVP. The
frontend consumes the existing API; it does not simulate persistence for
contracts that the API does not expose.

## Route ownership

| Route | Responsibility | Data boundary |
| --- | --- | --- |
| `/onboarding` | Collect the phase/stage context needed before roadmap reading. | Blocked on an enrollment write contract; no browser-only persistence. |
| `/now` | Show the authoritative current card and up to four queued cards. | `GET /roadmap/{user_id}/{phase_id}` and `POST /roadmap/{user_id}/{phase_id}/actions`. |
| `/horizon` | Show read-only grouped future cards and open a detail sheet. | `GET /roadmap/{user_id}/{phase_id}`; preview is local UI state. |
| `/settings` | Show supported client preferences and development identity state. | Notification preference persistence is blocked until its API contract exists. |
| `/now?ask=1` | Open the global Ask sheet while retaining the current route. | `POST /ask/{user_id}/{phase_id}`; optional explicit fold via the roadmap-fold endpoint. |

Next.js owns the document, build, and server route entry points. Hydrated client
navigation owns route state and browser history. There is one canonical route
state owner; screens must not duplicate history with a second router.

## API mapping

| Client need | Endpoint | Request requirements | Response used by UI |
| --- | --- | --- | --- |
| List published phases | `GET /phases` | None | Phase id and published metadata. |
| Read a published phase | `GET /phases/{phase_id}` | None | Onboarding field names and thresholds. |
| Read roadmap | `GET /roadmap/{user_id}/{phase_id}?stage={stage}` | `X-User-ID` must match `user_id`. | `current`, `now`, grouped `horizon`, phase id, version. |
| Record card action | `POST /roadmap/{user_id}/{phase_id}/actions` | `X-User-ID`; concern, action, stage, idempotency key. | Fresh authoritative roadmap response. |
| Ask | `POST /ask/{user_id}/{phase_id}` | `X-User-ID`; question 1–500 chars. | Answer mode, citations, and optional roadmap proposal. |
| Confirm roadmap fold | `POST /ask/{user_id}/{phase_id}/roadmap-folds/{concern_id}` | `X-User-ID`; `confirm: true`, stage, idempotency key. | Fresh authoritative roadmap response. |

All user-scoped requests carry a development `X-User-ID` and a generated
`X-Request-ID`. This is request scoping, not authentication. The client must
never describe this identity as a signed-in account.

## Client model rules

- Server roadmap data is authoritative after every read or mutation.
- Optimistic card feedback is transient and must reconcile or roll back from the
  returned roadmap response.
- Ask is a sheet state addressable from the current route; it is not a competing
  top-level page.
- Stable API error codes map to typed friendly messages. Raw server messages,
  questions, request bodies, and protected context are not logged or displayed.
- Citation links are optional presentation metadata and must not block card
  actions.

## Explicitly deferred prerequisites and mockup-only features

The current backend has no enrollment create/read/update endpoint and no
notification-preference endpoint. F-03 must add or explicitly defer those
contracts before onboarding and settings can claim persistence.

Until contracts exist, the client does not implement real authentication,
phase switching, archive/history, resource-library browsing, notification
delivery, export/delete, profile avatars, or unsupported mockup controls.
