import pytest
from app.modules.phases.schemas import Citation, Concern, PhaseModule
from pydantic import ValidationError


def valid_concern() -> dict[str, object]:
    return {
        "id": "visa-basics",
        "title": "Check your visa conditions",
        "urgency": 1,
        "horizon_days": 30,
        "hidden_factor": False,
        "bullets": ["Read the official conditions"],
        "why_now": "Early checks prevent avoidable delays.",
        "citation": {
            "id": "gov-visa",
            "title": "Visa conditions",
            "url": "https://example.gov/visa",
            "source_type": "government_portal",
            "reviewed_on": "2026-07-01",
        },
        "card": {
            "visual_url": "https://example.com/visa.png",
            "body": "Review the conditions.",
        },
    }


def test_phase_module_accepts_a_valid_versioned_configuration() -> None:
    module = PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "relocation",
            "source_policy": ["government_portal"],
            "onboarding_fields": ["origin_country", "destination_country"],
            "concerns": [valid_concern()],
        }
    )

    assert module.schema_version == "1.0"
    assert module.concerns[0].citation.source_type == "government_portal"


def test_phase_module_accepts_onboarding_field_metadata() -> None:
    module = PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "relocation",
            "source_policy": ["government_portal"],
            "onboarding_fields": ["origin_country"],
            "onboarding_field_metadata": [
                {
                    "key": "origin_country",
                    "label": "Where are you moving from?",
                    "description": "Your starting country.",
                    "required": False,
                }
            ],
            "concerns": [valid_concern()],
        }
    )

    assert module.onboarding_field_metadata[0].key == "origin_country"


def test_phase_module_rejects_metadata_for_unknown_onboarding_fields() -> None:
    with pytest.raises(
        ValidationError, match="metadata must reference configured fields"
    ):
        PhaseModule.model_validate(
            {
                "schema_version": "1.0",
                "phase_id": "relocation",
                "source_policy": ["government_portal"],
                "onboarding_fields": [],
                "onboarding_field_metadata": [
                    {"key": "origin_country", "label": "Origin"}
                ],
                "concerns": [valid_concern()],
            }
        )


def test_phase_module_rejects_unsupported_schema_versions() -> None:
    with pytest.raises(ValidationError, match="schema_version"):
        PhaseModule.model_validate(
            {
                "schema_version": "2.0",
                "phase_id": "relocation",
                "source_policy": ["government_portal"],
                "onboarding_fields": [],
                "concerns": [valid_concern()],
            }
        )


def test_concern_rejects_more_than_five_bullets() -> None:
    concern = valid_concern()
    concern["bullets"] = ["one", "two", "three", "four", "five", "six"]

    with pytest.raises(ValidationError, match="bullets"):
        Concern.model_validate(concern)


def test_citation_rejects_unapproved_source_type() -> None:
    with pytest.raises(ValidationError, match="source_type"):
        Citation.model_validate(
            {
                "id": "source",
                "title": "Source",
                "url": "https://example.com",
                "source_type": "blog",
                "reviewed_on": "2026-07-01",
            }
        )


def test_phase_module_rejects_duplicate_concern_ids() -> None:
    concern = valid_concern()
    duplicate = valid_concern()
    duplicate["title"] = "Another concern"

    with pytest.raises(ValidationError, match="unique"):
        PhaseModule.model_validate(
            {
                "schema_version": "1.0",
                "phase_id": "relocation",
                "source_policy": ["government_portal"],
                "onboarding_fields": [],
                "concerns": [concern, duplicate],
            }
        )
