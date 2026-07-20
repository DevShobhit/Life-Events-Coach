from pathlib import Path

from app.core.migrations import migration_files, normalize_database_url


def test_migration_files_are_ordered_sql_files():
    files = migration_files(Path(__file__).parents[1] / "migrations")
    assert [path.name for path in files] == [
        "001_phase_module_versions.sql",
        "002_phase_enrollments.sql",
        "003_card_actions.sql",
    ]


def test_normalize_database_url_for_sync_psycopg():
    assert normalize_database_url(
        "postgresql+asyncpg://user:pass@db:5432/app"
    ) == "postgresql://user:pass@db:5432/app"
