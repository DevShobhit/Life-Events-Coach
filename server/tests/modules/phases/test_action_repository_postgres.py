"""Opt-in PostgreSQL concurrency coverage for card actions.

Run with ``DATABASE_URL=postgresql+asyncpg://...``.  The test is skipped when
the variable is absent (or the database is not reachable), so the normal unit
suite never assumes Docker or a local PostgreSQL server.
"""

import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.phases.action_repository import CardActionRepository
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.orm_models import Base, CardProgressRecord


def _database_url() -> str | None:
    value = os.environ.get("DATABASE_URL")
    if not value:
        return None
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    return value


@pytest.mark.anyio
async def test_concurrent_postgres_actions_preserve_both_skips() -> None:
    url = _database_url()
    if url is None:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    if not url.startswith("postgresql+asyncpg://"):
        pytest.skip("DATABASE_URL must use PostgreSQL for this integration test")

    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        user_id = f"concurrent-user-{uuid4().hex}"
        concern_id = f"concurrent-card-{uuid4().hex}"
        try:
            async with engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
        except (OSError, SQLAlchemyError) as error:
            pytest.skip(f"PostgreSQL is unavailable: {error}")

        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as seed_session:
            seed_session.add(
                CardProgressRecord(
                    user_id=user_id,
                    phase_id="relocation",
                    concern_id=concern_id,
                    status="pending",
                    skip_count=0,
                )
            )
            await seed_session.commit()

        async def apply(key: str):
            async with factory() as session:
                return await CardActionRepository(session).apply(
                    user_id=user_id,
                    phase_id="relocation",
                    concern_id=concern_id,
                    action=CardAction.SKIP,
                    skip_threshold=99,
                    idempotency_key=key,
                )

        first, second = await asyncio.wait_for(
            asyncio.gather(apply("first"), apply("second")), timeout=10
        )
        assert sorted((first.skip_count, second.skip_count)) == [1, 2]

        async with factory() as verify_session:
            row = await verify_session.get(
                CardProgressRecord,
                (user_id, "relocation", concern_id),
            )
            assert row is not None
            assert row.skip_count == 2
    finally:
        await engine.dispose()
