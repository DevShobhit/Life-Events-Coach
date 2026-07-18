CREATE TABLE card_progress (
    user_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    concern_id TEXT NOT NULL,
    status TEXT NOT NULL,
    skip_count INTEGER NOT NULL DEFAULT 0 CHECK (skip_count >= 0),
    PRIMARY KEY (user_id, phase_id, concern_id)
);

CREATE TABLE card_actions (
    user_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    concern_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    action TEXT NOT NULL,
    resulting_status TEXT NOT NULL,
    skip_count INTEGER NOT NULL CHECK (skip_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, phase_id, concern_id, idempotency_key)
);
