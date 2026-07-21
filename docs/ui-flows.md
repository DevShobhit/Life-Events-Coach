# UI Flows

## Onboarding

The user selects a published phase from the API catalog, supplies required stage and optional context, then submits enrollment. The current phase response supplies an id and configured field names but not display labels or descriptions; the client must not invent phase metadata without a contract update. Validation is inline and accessible. Successful save replaces history with `/now`; cancellation does not silently persist answers. Missing persistence contracts are shown as unavailable rather than simulated.

## Now and Horizon

Now shows loading, retryable error, empty, or the current roadmap card and queue. A card action disables only its own control, announces progress, updates optimistically, and reconciles from the response. Safe transient failures enter the offline queue; rejected actions roll back. Horizon groups returned future items and opens a read-only detail overlay; close restores focus to its trigger. Removal requires confirmation.

## Ask

Ask is a URL-addressable sheet opened from the shell or `/now?ask=1`. Opening moves focus to the question field; questions are trimmed and limited to 1–500 characters, never logged, and submitted through the Ask mutation. Closing cancels in-flight work. Any roadmap proposal is a separate confirmed fold action.

## Offline replay, retry, and motion

After a successful roadmap read, the last safe response is available offline. Transport or retryable server failures queue ordered idempotent actions; malformed or rejected requests do not queue. Reconnect replays through the same API boundary and invalidates the exact roadmap query. Dialogs/sheets move focus in and restore it on close; route changes are immediate and reduced-motion preferences are honored.

## Route and service-worker recovery

`/now` and `/horizon` use the same typed roadmap query and do not issue a
request when the persisted session lacks a user, phase, or stage. Missing setup
routes to onboarding; API failures remain retryable and never display raw
server messages. The route smoke command is `bun run smoke:routes` from `ui/`.

The service worker is production-only, versioned, and limited to same-origin
documents and static assets. It never caches API responses or mutation
requests. Navigation is network-first with a previously successful document
fallback, and activation removes obsolete application caches. Registration and
update failures are development-debug events only.
