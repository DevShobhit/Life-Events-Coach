from datetime import date

from app.modules.phases.lifecycle import CardAction
from app.modules.phases.roadmap import InMemoryRoadmapState, apply_roadmap_action
from app.modules.phases.schemas import PhaseModule


def test_roadmap_actions_use_module_relevance_threshold() -> None:
    module = PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "custom",
            "source_policy": ["government_portal"],
            "thresholds": {"skip_count_for_relevance_check": 1},
            "concerns": [
                {
                    "id": "first",
                    "title": "First",
                    "urgency": 50,
                    "horizon_days": 1,
                    "bullets": ["One action"],
                    "why_now": "Now",
                    "citation": {
                        "id": "source",
                        "title": "Official guidance",
                        "url": "https://example.gov/guidance",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "Take this action."},
                }
            ],
        }
    )
    state = InMemoryRoadmapState()

    apply_roadmap_action(
        module,
        user_id="user",
        concern_id="first",
        action=CardAction.SKIP,
        stage="arrived",
        today=date(2026, 7, 21),
        state=state,
    )

    assert state.progress[("user", "custom", "first")].status == "relevance_check"
