CREATE TABLE IF NOT EXISTS phase_enrollments (
    user_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    progress_anchor DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, phase_id)
);

CREATE INDEX IF NOT EXISTS phase_enrollments_phase_idx ON phase_enrollments (phase_id);
