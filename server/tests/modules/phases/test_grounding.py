import asyncio

import pytest
from app.modules.phases.grounding import (
    GroundedMode,
    GroundingSource,
    GroundingTimeout,
    InProcessGroundingProvider,
    grounded_fallback,
    retrieve_sources,
)
from app.modules.phases.schemas import PhaseModule


def module_fixture(phase_id: str = "relocation") -> PhaseModule:
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": phase_id,
            "source_policy": ["government_portal"],
            "concerns": [
                {
                    "id": "visa",
                    "title": "Check visa conditions",
                    "urgency": 1,
                    "horizon_days": 1,
                    "bullets": ["Read official visa conditions"],
                    "why_now": "Deadlines can affect your move.",
                    "citation": {
                        "id": "visa-citation",
                        "title": "Visa conditions",
                        "url": "https://example.gov/visa",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "Review the official conditions."},
                },
                {
                    "id": "housing",
                    "title": "Find housing",
                    "urgency": 1,
                    "horizon_days": 30,
                    "bullets": ["Compare local options"],
                    "why_now": "Planning reduces stress.",
                    "citation": {
                        "id": "housing-citation",
                        "title": "Housing guidance",
                        "url": "https://example.gov/housing",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "Make a housing checklist."},
                },
            ],
        }
    )


def test_retrieval_is_scoped_and_bounded() -> None:
    sources = retrieve_sources(
        module_fixture(), question="visa conditions", max_results=1
    )

    assert len(sources) == 1
    assert sources[0].citation.id == "visa-citation"


def test_grounded_fallback_requires_and_returns_approved_citations() -> None:
    result = asyncio.run(
        grounded_fallback(module_fixture(), version=4, question="visa conditions")
    )

    assert result.mode == GroundedMode.GROUNDED
    assert result.version == 4
    assert result.citations[0].id == "visa-citation"
    assert "approved phase sources" in result.answer.lower()


def test_grounded_fallback_refuses_when_no_source_matches() -> None:
    result = asyncio.run(
        grounded_fallback(module_fixture(), version=1, question="taxi recipes")
    )

    assert result.mode == GroundedMode.REFUSAL
    assert result.citations == []
    assert "cannot" in result.answer.lower()


class SlowProvider(InProcessGroundingProvider):
    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]:
        await asyncio.sleep(0.05)
        return await super().retrieve(module, question, max_results)


def test_grounding_timeout_is_typed_and_does_not_return_uncited_content() -> None:
    with pytest.raises(GroundingTimeout):
        asyncio.run(
            grounded_fallback(
                module_fixture(),
                version=1,
                question="visa conditions",
                provider=SlowProvider(),
                timeout_seconds=0.001,
            )
        )
