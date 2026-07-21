from app.modules.phases.editorial import active_version_lock_statement
from sqlalchemy.dialects import postgresql


def test_editorial_publication_active_version_query_locks_the_row() -> None:
    statement = active_version_lock_statement("relocation")
    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert "FOR UPDATE" in compiled
    assert "phase_id" in compiled
