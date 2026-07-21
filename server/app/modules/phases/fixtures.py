"""Non-production launch fixture for the relocation phase.

Provenance: synthetic contract fixture for local/API tests only. It is not
legal, immigration, or relocation advice and must be replaced by editorially
reviewed launch content before production publication.
"""

from app.modules.phases.schemas import OnboardingField, PhaseModule

LAUNCH_RELOCATION_VERSION = 1

LAUNCH_RELOCATION = PhaseModule.model_validate(
    {
        "schema_version": "1.0",
        "phase_id": "relocation",
        "display_name": "Relocation",
        "description": "A practical path for moving and settling into a new place.",
        "source_policy": ["government_portal"],
        "onboarding_fields": [
            "origin_country",
            "destination_country",
            "relocation_stage",
        ],
        "onboarding_field_metadata": [
            {
                "key": "origin_country",
                "label": "Origin country",
                "description": "Where you are moving from.",
            },
            {
                "key": "destination_country",
                "label": "Destination country",
                "description": "Where you are moving to.",
            },
            {
                "key": "relocation_stage",
                "label": "Current stage",
                "description": "Where you are in the move.",
                "required": True,
            },
        ],
        "concerns": [
            {
                "id": "pre-departure-documents",
                "title": "Organize key documents before departure",
                "urgency": 90,
                "horizon_days": 0,
                "bullets": ["Keep identity and visa records together"],
                "why_now": "Missing documents can delay your move.",
                "citation": {
                    "id": "fixture-government-documents",
                    "title": "Official travel document guidance",
                    "url": "https://example.gov/travel-documents",
                    "source_type": "government_portal",
                    "reviewed_on": "2026-07-01",
                },
                "card": {"body": "Create a secure folder for your key documents."},
            },
            {
                "id": "arrival-registration",
                "title": "Find the local registration steps",
                "urgency": 70,
                "horizon_days": 30,
                "hidden_factor": True,
                "bullets": ["Check the destination authority website"],
                "why_now": "Early registration helps you access local services.",
                "citation": {
                    "id": "fixture-government-registration",
                    "title": "Official registration guidance",
                    "url": "https://example.gov/registration",
                    "source_type": "government_portal",
                    "reviewed_on": "2026-07-01",
                },
                "card": {"body": "Write down the registration deadline and office."},
            },
            {
                "id": "settling-services",
                "title": "Set up essential local services",
                "urgency": 50,
                "horizon_days": 90,
                "bullets": ["List housing, banking, and health-service tasks"],
                "why_now": "A short list makes settling in less overwhelming.",
                "citation": {
                    "id": "fixture-government-services",
                    "title": "Official local services directory",
                    "url": "https://example.gov/services",
                    "source_type": "government_portal",
                    "reviewed_on": "2026-07-01",
                },
                "card": {"body": "Choose one essential service to set up today."},
            },
        ],
        "qa_bank": [
            {
                "id": "documents-before-departure",
                "question": "What documents should I organize before departure?",
                "answer": "Keep identity and visa records together before departure.",
                "citations": [
                    {
                        "id": "fixture-government-documents",
                        "title": "Official travel document guidance",
                        "url": "https://example.gov/travel-documents",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    }
                ],
            }
        ],
    }
)


SECOND_PHASE = LAUNCH_RELOCATION.model_copy(
    update={
        "phase_id": "new_parent",
        "display_name": "Starting a family",
        "description": "A focused sequence for preparing a new family chapter.",
        "onboarding_fields": ["parenting_stage"],
        "onboarding_field_metadata": [
            OnboardingField(
                key="parenting_stage",
                label="Parenting stage",
                description="Where you are in the transition.",
                required=True,
            )
        ],
        "concerns": [
            concern.model_copy(
                update={
                    "id": f"parenting-{concern.id}",
                    "available_stages": ["preparing"],
                }
            )
            for concern in LAUNCH_RELOCATION.concerns
        ],
        "qa_bank": [
            answer.model_copy(update={"id": f"parenting-{answer.id}"})
            for answer in LAUNCH_RELOCATION.qa_bank
        ],
    }
)
