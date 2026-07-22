from datetime import date

import pytest
from app.modules.account.data_lifecycle import delete_account_data, export_account_data
from app.modules.phases.orm_models import Base, PhaseEnrollment
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


@pytest.mark.anyio
async def test_export_includes_subject_owned_enrollment() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(
            PhaseEnrollment(
                user_id="user-1",
                phase_id="phase-1",
                context={"goal": "focus"},
                progress_anchor=date(2026, 7, 21),
            )
        )
        await session.commit()
        result = await export_account_data(session, "user-1")
        assert result.enrollments[0]["phase_id"] == "phase-1"
        assert result.card_actions == []
    await engine.dispose()


@pytest.mark.anyio
async def test_delete_removes_all_subject_owned_rows() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(
            PhaseEnrollment(
                user_id="user-1", phase_id="phase-1", context={}, progress_anchor=date(2026, 7, 21)
            )
        )
        await session.commit()
        await delete_account_data(session, "user-1")
        result = await export_account_data(session, "user-1")
        assert result.enrollments == []
    await engine.dispose()
