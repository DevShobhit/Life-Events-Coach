from datetime import date
from typing import Any

import pytest
from app.modules.phases.publication import (
    PhaseModuleCache,
    PhaseModulePublisher,
    PublicationError,
    validate_launch_content,
)
from app.modules.phases.schemas import PhaseModule


def module_payload(phase_id: str = "relocation") -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "phase_id": phase_id,
        "source_policy": ["government_portal"],
        "onboarding_fields": [],
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


class FakeRepository:
    def __init__(self) -> None:
        self.published: list[tuple[PhaseModule, int]] = []

    async def publish(self, module: PhaseModule, *, version: int) -> None:
        self.published.append((module, version))


@pytest.mark.anyio
async def test_valid_publication_invalidates_only_the_affected_phase() -> None:
    repository = FakeRepository()
    cache = PhaseModuleCache()
    cache.put(PhaseModule.model_validate(module_payload("relocation")))
    cache.put(PhaseModule.model_validate(module_payload("new_parent")))
    publisher = PhaseModulePublisher(repository, cache)

    await publisher.publish(module_payload(), version=2, today=date(2026, 7, 18))

    assert cache.get("relocation") is None
    assert cache.get("new_parent") is not None
    assert repository.published[0][1] == 2


@pytest.mark.anyio
async def test_invalid_publication_returns_field_errors_and_keeps_cache() -> None:
    repository = FakeRepository()
    cache = PhaseModuleCache()
    cached = PhaseModule.model_validate(module_payload())
    cache.put(cached)
    publisher = PhaseModulePublisher(repository, cache)
    invalid = module_payload()
    invalid["schema_version"] = "2.0"
    invalid["concerns"][0]["citation"]["source_type"] = "blog"

    with pytest.raises(PublicationError) as error:
        await publisher.publish(invalid, version=2, today=date(2026, 7, 18))

    assert "schema_version" in error.value.field_errors
    assert "source_type" in error.value.field_errors
    assert cache.get("relocation") == cached
    assert repository.published == []


@pytest.mark.anyio
async def test_future_review_date_is_rejected_before_repository_write() -> None:
    repository = FakeRepository()
    publisher = PhaseModulePublisher(repository, PhaseModuleCache())
    invalid = module_payload()
    invalid["concerns"][0]["citation"]["reviewed_on"] = "2026-07-19"

    with pytest.raises(PublicationError, match="reviewed_on"):
        await publisher.publish(invalid, version=1, today=date(2026, 7, 18))

    assert repository.published == []


def test_production_content_gate_rejects_fixture_domains_small_banks_and_missing_visuals() -> None:
    module = PhaseModule.model_validate(module_payload())

    errors = validate_launch_content(module, production=True)

    assert "concerns" in errors
    assert "citation.url" in errors
    assert "card.visual_url" in errors


def test_production_content_gate_rejects_more_than_sixty_concerns() -> None:
    payload = module_payload()
    payload["concerns"] = [
        {**payload["concerns"][0], "id": f"concern-{index}"}
        for index in range(61)
    ]
    module = PhaseModule.model_validate(payload)

    errors = validate_launch_content(module, production=True)

    assert "concerns" in errors
    assert any("at most 60" in message for message in errors["concerns"])


def test_non_production_fixture_is_allowed_by_content_gate() -> None:
    module = PhaseModule.model_validate(module_payload())

    assert validate_launch_content(module, production=False) == {}
