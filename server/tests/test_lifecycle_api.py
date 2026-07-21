import os
import tempfile
from collections.abc import AsyncIterator
from pathlib import Path

from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION, SECOND_PHASE
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

lifecycle_engine = None
lifecycle_initialized = False
lifecycle_database = Path(tempfile.gettempdir()) / f"lifecurriculum-{os.getpid()}.db"


async def override_lifecycle_session() -> AsyncIterator[AsyncSession]:
    global lifecycle_engine, lifecycle_initialized
    if lifecycle_engine is None:
        lifecycle_engine = create_async_engine(f"sqlite+aiosqlite:///{lifecycle_database}")
    async with lifecycle_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(lifecycle_engine, expire_on_commit=False)
    async with factory() as session:
        if not lifecycle_initialized:
            await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)
            lifecycle_initialized = True
        yield session


def test_phase_lifecycle_complete_archive_and_history() -> None:
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_lifecycle_session
    try:
        with TestClient(app) as client:
            headers = {"X-User-ID": "lifecycle-user"}
            saved = client.put(
                "/enrollment/lifecycle-user/relocation",
                json={"context": {"relocation_stage": "arrived"}},
                headers=headers,
            )
            completed = client.post(
                "/enrollment/lifecycle-user/relocation/complete",
                headers=headers,
            )
            archived = client.post(
                "/enrollment/lifecycle-user/relocation/archive",
                headers=headers,
            )
            history = client.get(
                "/enrollment/lifecycle-user/history", headers=headers
            )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert saved.status_code == 200
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "completed"
    assert archived.json()["status"] == "archived"
    assert [event["event"] for event in history.json()] == ["archived", "completed"]


def test_phase_lifecycle_rejects_repeated_transition_and_wrong_subject() -> None:
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_lifecycle_session
    try:
        with TestClient(app) as client:
            headers = {"X-User-ID": "lifecycle-user-2"}
            client.put(
                "/enrollment/lifecycle-user-2/relocation",
                json={"context": {"relocation_stage": "arrived"}},
                headers=headers,
            )
            first = client.post(
                "/enrollment/lifecycle-user-2/relocation/complete",
                headers=headers,
            )
            repeated = client.post(
                "/enrollment/lifecycle-user-2/relocation/complete",
                headers=headers,
            )
            forbidden = client.get(
                "/enrollment/lifecycle-user-2/history",
                headers={"X-User-ID": "other-user"},
            )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert first.status_code == 200
    assert repeated.status_code == 409
    assert repeated.json()["error"]["code"] == "conflict"
    assert forbidden.status_code == 403


def test_active_enrollment_list_supports_safe_multi_phase_switching() -> None:
    previous_overrides = dict(app.dependency_overrides)

    async def override_with_two_phases() -> AsyncIterator[AsyncSession]:
        global lifecycle_engine, lifecycle_initialized
        if lifecycle_engine is None:
            lifecycle_engine = create_async_engine(
                f"sqlite+aiosqlite:///{lifecycle_database}"
            )
        async with lifecycle_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(lifecycle_engine, expire_on_commit=False)
        async with factory() as session:
            repository = PhaseModuleRepository(session)
            if not await repository.list_versions("relocation"):
                await repository.publish(LAUNCH_RELOCATION, version=1)
            if not await repository.list_versions("new_parent"):
                await repository.publish(SECOND_PHASE, version=1)
            yield session

    app.dependency_overrides[get_session] = override_with_two_phases
    try:
        with TestClient(app) as client:
            headers = {"X-User-ID": "multi-phase-user"}
            client.put(
                "/enrollment/multi-phase-user/relocation",
                json={"context": {"relocation_stage": "arrived"}},
                headers=headers,
            )
            client.put(
                "/enrollment/multi-phase-user/new_parent",
                json={"context": {"parenting_stage": "preparing"}},
                headers=headers,
            )
            active = client.get("/enrollment/multi-phase-user", headers=headers)
            client.post(
                "/enrollment/multi-phase-user/new_parent/complete", headers=headers
            )
            after_completion = client.get(
                "/enrollment/multi-phase-user", headers=headers
            )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert active.status_code == 200
    assert {item["phase_id"] for item in active.json()} == {
        "relocation",
        "new_parent",
    }
    assert after_completion.status_code == 200
    assert [item["phase_id"] for item in after_completion.json()] == ["relocation"]
