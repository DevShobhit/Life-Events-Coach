import json
from pathlib import Path
from unittest.mock import Mock

from app.core.migrations import (
    migration_files,
    normalize_database_url,
    validate_seed_payload,
)
from app.modules.phases.fixtures import LAUNCH_RELOCATION


def test_migration_files_are_ordered_sql_files() -> None:
    files = migration_files(Path(__file__).parents[1] / "migrations")
    assert [path.name for path in files] == [
        "001_phase_module_versions.sql",
        "002_phase_enrollments.sql",
        "003_card_actions.sql",
        "004_notification_preferences.sql",
        "005_card_completion_date.sql",
        "006_phase_lifecycle.sql",
        "007_editorial_drafts.sql",
        "008_editorial_publication_idempotency.sql",
        "009_notification_intents.sql",
    ]


def test_normalize_database_url_for_sync_psycopg() -> None:
    assert (
        normalize_database_url("postgresql+asyncpg://user:pass@db:5432/app")
        == "postgresql://user:pass@db:5432/app"
    )


def test_migrations_are_safe_when_database_init_scripts_precreated_schema() -> None:
    migration_dir = Path(__file__).parents[1] / "migrations"
    sql = "\n".join(
        path.read_text(encoding="utf-8") for path in migration_files(migration_dir)
    )

    assert "CREATE TABLE IF NOT EXISTS phase_module_versions" in sql
    assert "CREATE TABLE IF NOT EXISTS phase_module_active" in sql
    assert "CREATE TABLE IF NOT EXISTS phase_enrollments" in sql
    assert "CREATE TABLE IF NOT EXISTS card_progress" in sql
    assert "CREATE TABLE IF NOT EXISTS card_actions" in sql
    assert "CREATE TABLE IF NOT EXISTS phase_module_drafts" in sql
    assert "CREATE TABLE IF NOT EXISTS editorial_audit_events" in sql
    assert "CREATE TABLE IF NOT EXISTS editorial_publication_idempotency" in sql
    assert "CREATE INDEX IF NOT EXISTS" in sql
    assert "FROM pg_trigger" in sql


def test_production_seed_payload_uses_the_publication_content_gate() -> None:
    seed_file = Mock(spec=Path)
    seed_file.read_text.return_value = json.dumps(
        {
            "phase_id": LAUNCH_RELOCATION.phase_id,
            "version": 1,
            "content": LAUNCH_RELOCATION.model_dump(mode="json"),
        }
    )

    try:
        validate_seed_payload(seed_file, production=True)
    except ValueError as error:
        assert "reviewed concerns" in str(error)
    else:
        raise AssertionError("unsafe production seed unexpectedly passed")
