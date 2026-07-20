from pathlib import Path

from app.core.migrations import migration_files, normalize_database_url


def test_migration_files_are_ordered_sql_files() -> None:
    files = migration_files(Path(__file__).parents[1] / "migrations")
    assert [path.name for path in files] == [
        "001_phase_module_versions.sql",
        "002_phase_enrollments.sql",
        "003_card_actions.sql",
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
    assert "CREATE INDEX IF NOT EXISTS" in sql
    assert "FROM pg_trigger" in sql
