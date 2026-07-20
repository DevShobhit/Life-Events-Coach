from collections.abc import AsyncGenerator
from typing import Any

import pytest
from app.modules.phases.action_repository import CardActionRepository
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.orm_models import Base
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as database_session:
        yield database_session
    await engine.dispose()


@pytest.mark.anyio
async def test_skip_threshold_persists_relevance_check(session: AsyncSession) -> None:
    repository = CardActionRepository(session)

    await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.SKIP,
        skip_threshold=2,
        idempotency_key="one",
    )
    result = await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.SKIP,
        skip_threshold=2,
        idempotency_key="two",
    )

    assert result.status == "relevance_check"
    assert result.skip_count == 2


@pytest.mark.anyio
async def test_duplicate_action_key_is_idempotent(session: AsyncSession) -> None:
    repository = CardActionRepository(session)
    first = await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.DONE,
        skip_threshold=2,
        idempotency_key="same",
    )
    second = await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.DONE,
        skip_threshold=2,
        idempotency_key="same",
    )

    assert first.idempotent is False
    assert second == type(first)(status="done", skip_count=0, idempotent=True)


@pytest.mark.anyio
async def test_idempotency_key_reuse_with_different_action_is_rejected(
    session: AsyncSession,
) -> None:
    repository = CardActionRepository(session)
    await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.DONE,
        skip_threshold=2,
        idempotency_key="same",
    )

    with pytest.raises(ValueError, match="idempotency key already used"):
        await repository.apply(
            user_id="u",
            phase_id="relocation",
            concern_id="c",
            action=CardAction.SKIP,
            skip_threshold=2,
            idempotency_key="same",
        )


@pytest.mark.anyio
async def test_progress_row_is_selected_for_update_before_transition(
    session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repository = CardActionRepository(session)
    calls: list[bool] = []
    original = session.get

    async def get(model: Any, ident: Any, **kwargs: Any) -> Any:
        calls.append(bool(kwargs.get("with_for_update")))
        return await original(model, ident, **kwargs)

    monkeypatch.setattr(session, "get", get)
    await repository.apply(
        user_id="u",
        phase_id="relocation",
        concern_id="c",
        action=CardAction.DONE,
        skip_threshold=2,
        idempotency_key="one",
    )
    assert True in calls
