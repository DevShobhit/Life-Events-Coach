from collections.abc import AsyncIterator

import pytest
from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


async def override_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)
        yield session
    await engine.dispose()




@pytest.fixture(autouse=True)
def isolated_catalog_session():
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        yield
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_catalog_exposes_only_the_launch_relocation_module() -> None:
    response = TestClient(app).get("/phases")

    assert response.status_code == 200
    assert [entry["module"]["phase_id"] for entry in response.json()] == ["relocation"]


def test_phase_read_includes_version_and_citations() -> None:
    response = TestClient(app).get("/phases/relocation")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 1
    assert all("citation" in concern for concern in body["module"]["concerns"])


def test_unknown_phase_is_not_exposed_by_the_catalog() -> None:
    response = TestClient(app).get("/phases/new_parent")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "phase not found",
            "request_id": None,
        }
    }
