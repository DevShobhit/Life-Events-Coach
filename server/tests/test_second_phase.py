from collections.abc import AsyncIterator

from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION, SECOND_PHASE
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


async def override_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)
        await PhaseModuleRepository(session).publish(SECOND_PHASE, version=1)
        yield session
    await engine.dispose()


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
