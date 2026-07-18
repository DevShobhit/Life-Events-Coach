from datetime import date

from app.modules.phases.priority import RankRequest, rank_concerns
from app.modules.phases.schemas import Concern


def concern(
    concern_id: str,
    *,
    urgency: int = 50,
    horizon_days: int = 30,
    hidden_factor: bool = False,
    stages: list[str] | None = None,
) -> Concern:
    return Concern.model_validate(
        {
            "id": concern_id,
            "title": concern_id,
            "urgency": urgency,
            "horizon_days": horizon_days,
            "hidden_factor": hidden_factor,
            "available_stages": stages or [],
            "bullets": ["One action"],
            "why_now": "It is useful now.",
            "citation": {
                "id": f"citation-{concern_id}",
                "title": "Official guidance",
                "url": "https://example.gov/guidance",
                "source_type": "government_portal",
                "reviewed_on": "2026-07-01",
            },
            "card": {"body": "Take this action."},
        }
    )


def test_ranker_is_deterministic_and_uses_stable_id_tie_breaking() -> None:
    items = [concern("b", urgency=50), concern("a", urgency=50)]
    request = RankRequest(today=date(2026, 7, 18), stage="arrived")

    first = rank_concerns(items, request)
    second = rank_concerns(items, request)

    assert [item.concern.id for item in first] == ["a", "b"]
    assert first == second


def test_ranker_excludes_handled_and_ineligible_stage_items() -> None:
    items = [
        concern("handled"),
        concern("pre-departure-only", stages=["pre_departure"]),
        concern("arrived", stages=["arrived"]),
    ]

    result = rank_concerns(
        items,
        RankRequest(
            today=date(2026, 7, 18), stage="arrived", handled_ids=frozenset({"handled"})
        ),
    )

    assert [item.concern.id for item in result] == ["arrived"]
    assert "handled" not in result[0].reason


def test_hidden_factor_is_surfaced_in_horizon_before_its_window() -> None:
    item = concern("hidden", horizon_days=90, hidden_factor=True)

    result = rank_concerns(
        [item],
        RankRequest(today=date(2026, 7, 18), stage="arrived", horizon_days=30),
    )

    assert result[0].view == "horizon"
    assert "hidden factor" in result[0].reason
