import asyncio
from collections.abc import AsyncIterator, Iterator

import pytest
from app.core.database import get_session
from app.main import app
from app.modules.phases.fixtures import LAUNCH_RELOCATION
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine("sqlite+aiosqlite://")
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def initialize_database() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with session_factory() as session:
        await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)


asyncio.run(initialize_database())


async def override_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


@pytest.fixture(autouse=True)
def ask_session_override() -> Iterator[None]:
    previous = app.dependency_overrides.get(get_session)
    app.dependency_overrides[get_session] = override_session
    yield
    if previous is None:
        app.dependency_overrides.pop(get_session, None)
    else:
        app.dependency_overrides[get_session] = previous


def test_ask_returns_curated_answer_with_citations() -> None:
    response = TestClient(app).post(
        "/ask/ask-user/relocation",
        json={"question": "What documents should I organize before departure?"},
        headers={"X-User-ID": "ask-user"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "curated"
    assert body["answer_id"] == "documents-before-departure"
    assert body["citations"]
    assert body["roadmap_proposal"] is None


def test_ask_returns_grounded_proposal_without_mutating_roadmap() -> None:
    client = TestClient(app)
    before = client.get(
        "/roadmap/ask-user/relocation", headers={"X-User-ID": "ask-user"}
    ).json()

    response = client.post(
        "/ask/ask-user/relocation",
        json={"question": "registration deadline"},
        headers={"X-User-ID": "ask-user"},
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "grounded"
    assert response.json()["roadmap_proposal"]["concern_id"] == "arrival-registration"
    after = client.get(
        "/roadmap/ask-user/relocation", headers={"X-User-ID": "ask-user"}
    ).json()
    assert after == before


def test_roadmap_fold_requires_explicit_confirmation() -> None:
    client = TestClient(app)
    response = client.post(
        "/ask/ask-user/relocation/roadmap-folds/pre-departure-documents",
        json={"confirm": False, "idempotency_key": "fold-1"},
        headers={"X-User-ID": "ask-user"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "bad_request"


def test_roadmap_fold_confirmation_is_authorized_and_idempotent() -> None:
    client = TestClient(app)
    path = "/ask/ask-user/relocation/roadmap-folds/pre-departure-documents"
    first = client.post(
        path,
        json={"confirm": True, "idempotency_key": "fold-2"},
        headers={"X-User-ID": "ask-user"},
    )
    second = client.post(
        path,
        json={"confirm": True, "idempotency_key": "fold-2"},
        headers={"X-User-ID": "ask-user"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()


def test_ask_rejects_mismatched_user_scope() -> None:
    response = TestClient(app).post(
        "/ask/ask-user/relocation",
        json={"question": "key documents"},
        headers={"X-User-ID": "other-user"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_ask_refuses_unsupported_questions() -> None:
    response = TestClient(app).post(
        "/ask/ask-user/relocation",
        json={"question": "recipes for a taxi"},
        headers={"X-User-ID": "ask-user"},
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "refusal"
    assert response.json()["citations"] == []


def test_ask_rejects_malformed_question() -> None:
    response = TestClient(app).post(
        "/ask/ask-user/relocation",
        json={"question": ""},
        headers={"X-User-ID": "ask-user"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
