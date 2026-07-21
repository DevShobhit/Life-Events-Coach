from collections.abc import AsyncIterator

from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION
from app.modules.phases.orm_models import Base
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

editorial_engine = create_async_engine(
    "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
)
editorial_factory = async_sessionmaker(editorial_engine, expire_on_commit=False)
editorial_schema_ready = False


async def override_session() -> AsyncIterator[AsyncSession]:
    global editorial_schema_ready
    if not editorial_schema_ready:
        async with editorial_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        editorial_schema_ready = True
    async with editorial_factory() as session:
        yield session


def test_editorial_publish_requires_editorial_role() -> None:
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            response = client.post(
                "/editorial/phases/relocation/publish",
                headers={"X-User-ID": "editor-1"},
                json={"version": 1, "module": LAUNCH_RELOCATION.model_dump(mode="json")},
            )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_editorial_publish_and_version_history_are_role_protected() -> None:
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            headers = {"X-User-ID": "editor-1", "X-User-Role": "publisher"}
            response = client.post(
                "/editorial/phases/relocation/publish",
                headers=headers,
                json={"version": 1, "module": LAUNCH_RELOCATION.model_dump(mode="json")},
            )
            assert response.status_code == 200
            assert response.json()["status"] == "published"

            history = client.get(
                "/editorial/phases/relocation/versions", headers=headers
            )
        assert history.status_code == 200
        assert history.json()[0]["version"] == 1
        assert history.json()[0]["status"] == "published"
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_editor_role_cannot_publish_and_duplicate_versions_are_conflicts() -> None:
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            editor_headers = {"X-User-ID": "editor-1", "X-User-Role": "editor"}
            editor_response = client.post(
                "/editorial/phases/relocation/publish",
                headers=editor_headers,
                json={"version": 2, "module": LAUNCH_RELOCATION.model_dump(mode="json")},
            )
            assert editor_response.status_code == 403

            publisher_headers = {"X-User-ID": "editor-1", "X-User-Role": "publisher"}
            first = client.post(
                "/editorial/phases/relocation/publish",
                headers=publisher_headers,
                json={"version": 2, "module": LAUNCH_RELOCATION.model_dump(mode="json")},
            )
            duplicate = client.post(
                "/editorial/phases/relocation/publish",
                headers=publisher_headers,
                json={"version": 2, "module": LAUNCH_RELOCATION.model_dump(mode="json")},
            )
        assert first.status_code == 200
        assert duplicate.status_code == 409
        assert duplicate.json()["error"]["code"] == "conflict"
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
