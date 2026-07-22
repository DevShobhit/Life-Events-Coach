CREATE TABLE IF NOT EXISTS phase_module_versions (
    phase_id TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    schema_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'deprecated')),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (phase_id, version)
);

CREATE TABLE IF NOT EXISTS phase_module_active (
    phase_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    CONSTRAINT phase_module_active_version_fk
        FOREIGN KEY (phase_id, version)
        REFERENCES phase_module_versions (phase_id, version)
);

CREATE INDEX IF NOT EXISTS phase_module_versions_published_idx
    ON phase_module_versions (phase_id, version DESC)
    WHERE status = 'published';

CREATE OR REPLACE FUNCTION reject_phase_module_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR NEW.phase_id IS DISTINCT FROM OLD.phase_id
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
       OR NEW.content IS DISTINCT FROM OLD.content THEN
        RAISE EXCEPTION 'phase module version identity and content are append-only';
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'phase_module_versions_append_only'
          AND tgrelid = 'phase_module_versions'::regclass
    ) THEN
        CREATE TRIGGER phase_module_versions_append_only
        BEFORE UPDATE OR DELETE ON phase_module_versions
        FOR EACH ROW EXECUTE FUNCTION reject_phase_module_version_mutation();
    END IF;
END
$$;
