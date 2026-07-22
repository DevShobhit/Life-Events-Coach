ALTER TABLE phase_enrollments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE phase_enrollments
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

ALTER TABLE phase_enrollments
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS phase_lifecycle_events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    phase_id VARCHAR(100) NOT NULL,
    event VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phase_lifecycle_events_user_idx
    ON phase_lifecycle_events (user_id, occurred_at DESC);
