"""Small, repeatable PostgreSQL migration and content-seed runner.

This intentionally avoids a framework: migrations are numbered SQL files and
their application is tracked in one table. The command is suitable for deploy
hooks and can be run repeatedly without changing applied data.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import psycopg

from app.core.settings import get_settings
from app.modules.phases.publication import validate_launch_content
from app.modules.phases.schemas import PhaseModule

MIGRATIONS_DIR = Path(__file__).parents[2] / "migrations"


def migration_files(directory: Path = MIGRATIONS_DIR) -> list[Path]:
    return sorted(directory.glob("[0-9][0-9][0-9]_*.sql"))


def normalize_database_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


def validate_seed_payload(
    seed_file: Path, *, production: bool = False
) -> tuple[str, int, PhaseModule, str]:
    """Validate a seed file before it can be written to the published catalog."""
    payload: dict[str, Any] = json.loads(seed_file.read_text(encoding="utf-8"))
    module = PhaseModule.model_validate(payload["content"])
    phase_id = str(payload["phase_id"])
    if module.phase_id != phase_id:
        raise ValueError("seed phase_id must match content.phase_id")
    errors = validate_launch_content(module, production=production)
    if errors:
        details = "; ".join(
            f"{field}: {message}" for field, message in errors.items()
        )
        raise ValueError(f"seed content rejected: {details}")
    return phase_id, int(payload["version"]), module, str(
        payload.get("status", "published")
    )


def migrate(database_url: str | None = None, directory: Path = MIGRATIONS_DIR) -> int:
    """Apply unapplied migrations and return the number applied."""
    url = normalize_database_url(database_url or get_settings().database_url)
    with psycopg.connect(url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
            cursor.execute("SELECT version FROM schema_migrations")
            applied = {row[0] for row in cursor.fetchall()}
            count = 0
            for path in migration_files(directory):
                if path.name in applied:
                    continue
                cursor.execute(path.read_text(encoding="utf-8"))
                cursor.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)", (path.name,)
                )
                count += 1
        connection.commit()
    return count


def seed_launch_content(
    database_url: str | None = None, seed_file: Path | None = None
) -> bool:
    """Insert one unpublished launch module; never overwrite an existing version."""
    if os.getenv("APP_ENV", get_settings().app_env) == "production" and not os.getenv(
        "ALLOW_CONTENT_SEED"
    ):
        raise RuntimeError(
            "content seeding requires ALLOW_CONTENT_SEED outside development"
        )
    if seed_file is None:
        raise ValueError("--seed-file is required")
    phase_id, version, module, status = validate_seed_payload(
        seed_file,
        production=os.getenv("APP_ENV", get_settings().app_env) == "production",
    )
    url = normalize_database_url(database_url or get_settings().database_url)
    with psycopg.connect(url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM phase_module_versions WHERE phase_id=%s AND version=%s",
                (phase_id, version),
            )
            if cursor.fetchone():
                return False
            cursor.execute(
                "INSERT INTO phase_module_versions "
                "(phase_id, version, schema_version, status, content) VALUES (%s,%s,%s,%s,%s)",
                (
                    phase_id,
                    version,
                    module.schema_version,
                    status,
                    json.dumps(module.model_dump(mode="json")),
                ),
            )
        connection.commit()
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Database migration and seed commands")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("migrate")
    seed = subparsers.add_parser("seed-launch")
    seed.add_argument("--seed-file", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "migrate":
        print(f"applied {migrate()} migration(s)")
    else:
        print(
            "seeded"
            if seed_launch_content(seed_file=args.seed_file)
            else "already present"
        )


if __name__ == "__main__":
    main()
