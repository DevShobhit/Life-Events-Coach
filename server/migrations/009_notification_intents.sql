CREATE TABLE IF NOT EXISTS notification_intents (
    dedupe_key VARCHAR(200) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    local_day DATE NOT NULL,
    phase_ids JSONB NOT NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'due',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL,
    claimed_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_intents_pending_idx
    ON notification_intents (status, created_at);
