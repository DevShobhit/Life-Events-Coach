from collections.abc import AsyncIterator

from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION, SECOND_PHASE
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

phase_engine = create_async_engine(
    "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
)
phase_factory = async_sessionmaker(phase_engine, expire_on_commit=False)
phase_schema_ready = False

async def override_session() -> AsyncIterator[AsyncSession]:
    global phase_schema_ready
    if not phase_schema_ready:
        async with phase_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with phase_factory() as session:
            await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)
            await PhaseModuleRepository(session).publish(SECOND_PHASE, version=1)
        phase_schema_ready = True
    async with phase_factory() as session:
        yield session


def test_catalog_exposes_two_phase_modules_without_cross_phase_content() -> None:
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            catalog = client.get("/phases")
            relocation = client.get("/phases/relocation")
            parent = client.get("/phases/new_parent")
        assert {item["module"]["phase_id"] for item in catalog.json()} == {
            "relocation",
            "new_parent",
        }
        assert relocation.json()["module"]["onboarding_fields"] != ["parenting_stage"]
        assert parent.json()["module"]["onboarding_fields"] == ["parenting_stage"]
        assert all(
            concern["id"].startswith("parenting-")
            for concern in parent.json()["module"]["concerns"]
        )
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_roadmap_and_ask_round_trip_remain_phase_scoped() -> None:
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            headers = {"X-User-ID": "user-1"}
            roadmap = client.get(
                "/roadmap/user-1/new_parent?stage=preparing", headers=headers
            )
            ask = client.post(
                "/ask/user-1/new_parent",
                headers=headers,
                json={"question": SECOND_PHASE.qa_bank[0].question},
            )
        assert roadmap.status_code == 200
        assert roadmap.json()["phase_id"] == "new_parent"
        assert all(
            card["concern_id"].startswith("parenting-")
            for card in roadmap.json()["now"] + [
                card for group in roadmap.json()["horizon"] for card in group["cards"]
            ]
        )
        assert ask.status_code == 200
        assert ask.json()["phase_id"] == "new_parent"
        assert ask.json()["answer_id"].startswith("parenting-")
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
