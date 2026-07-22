from collections.abc import AsyncGenerator

import pytest
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from app.modules.phases.schemas import PhaseModule
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def module_fixture(phase_id: str = "relocation") -> PhaseModule:
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": phase_id,
            "source_policy": ["government_portal"],
            "onboarding_fields": ["origin_country"],
            "concerns": [
                {
                    "id": "visa-basics",
                    "title": "Check visa conditions",
                    "urgency": 1,
                    "horizon_days": 30,
                    "bullets": ["Read the official conditions"],
                    "why_now": "Early checks prevent delays.",
                    "citation": {
                        "id": "gov-visa",
                        "title": "Visa conditions",
                        "url": "https://example.gov/visa",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "Review the conditions."},
                }
            ],
        }
    )


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
async def test_published_module_can_be_read_from_the_active_version(
    session: AsyncSession,
) -> None:
    repository = PhaseModuleRepository(session)
    module = module_fixture()

    await repository.publish(module, version=1)

    assert await repository.get_active("relocation") == module


@pytest.mark.anyio
async def test_active_read_does_not_expose_an_older_version(
    session: AsyncSession,
) -> None:
    repository = PhaseModuleRepository(session)
    first = module_fixture()
    second = module_fixture()
    second.onboarding_fields = ["destination_country"]

    await repository.publish(first, version=1)
    await repository.publish(second, version=2)

    assert await repository.get_active("relocation") == second


@pytest.mark.anyio
async def test_publishing_same_version_is_rejected_without_overwriting_content(
    session: AsyncSession,
) -> None:
    repository = PhaseModuleRepository(session)
    module = module_fixture()

    await repository.publish(module, version=1)
    with pytest.raises(IntegrityError):
        await repository.publish(module, version=1)

    assert await repository.get_active("relocation") == module
