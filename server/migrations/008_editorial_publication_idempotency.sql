CREATE TABLE IF NOT EXISTS editorial_publication_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
