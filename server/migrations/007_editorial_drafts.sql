CREATE TABLE IF NOT EXISTS phase_module_drafts (
    draft_id TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL,
    base_version INTEGER,
    schema_version TEXT NOT NULL,
    content JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    revision INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    validation_report JSONB,
    published_version INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_phase_module_drafts_phase_id
    ON phase_module_drafts (phase_id);

CREATE TABLE IF NOT EXISTS editorial_audit_events (
    event_id TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL,
    draft_id TEXT,
    version INTEGER,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event TEXT NOT NULL,
    request_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_editorial_audit_events_phase_id
    ON editorial_audit_events (phase_id);
