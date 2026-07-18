from collections.abc import AsyncIterator

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


app.dependency_overrides[get_session] = override_session


def test_roadmap_api_returns_now_horizon_and_versioned_citations() -> None:
    response = TestClient(app).get(
        "/roadmap/api-user/relocation?stage=arrived",
        headers={"X-User-ID": "api-user"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 1
    assert body["current"]["citation_id"]
    assert body["horizon"]


def test_roadmap_action_returns_resequenced_response() -> None:
    client = TestClient(app)
    initial = client.get(
        "/roadmap/action-user/relocation", headers={"X-User-ID": "action-user"}
    ).json()
    concern_id = initial["current"]["concern_id"]

    response = client.post(
        "/roadmap/action-user/relocation/actions",
        json={"concern_id": concern_id, "action": "done", "idempotency_key": "done-1"},
        headers={"X-User-ID": "action-user"},
    )

    assert response.status_code == 200
    visible_ids = [card["concern_id"] for card in response.json()["now"]]
    visible_ids.extend(
        card["concern_id"]
        for group in response.json()["horizon"]
        for card in group["cards"]
    )
    assert concern_id not in visible_ids


def test_roadmap_rejects_a_mismatched_user_scope() -> None:
    response = TestClient(app).get(
        "/roadmap/api-user/relocation", headers={"X-User-ID": "other-user"}
    )

    assert response.status_code == 403
