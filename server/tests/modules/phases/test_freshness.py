from datetime import date

from app.modules.phases.freshness import freshness_report
from app.modules.phases.schemas import PhaseModule


def module_fixture() -> PhaseModule:
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "relocation",
            "source_policy": ["government_portal"],
            "thresholds": {"freshness_days": 90},
            "concerns": [
                {
                    "id": "fresh-item",
                    "title": "Fresh item",
                    "urgency": 1,
                    "horizon_days": 1,
                    "bullets": ["Read the source"],
                    "why_now": "The source is current.",
                    "citation": {
                        "id": "fresh-citation",
                        "title": "Fresh source",
                        "url": "https://example.gov/fresh",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-04-02",
                    },
                    "card": {"body": "Fresh body"},
                },
                {
                    "id": "stale-item",
                    "title": "Stale item",
                    "urgency": 1,
                    "horizon_days": 1,
                    "bullets": ["Review the source"],
                    "why_now": "The source needs review.",
                    "citation": {
                        "id": "stale-citation",
                        "title": "Stale source",
                        "url": "https://example.gov/stale",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-01-01",
                    },
                    "card": {"body": "Stale body"},
                },
            ],
        }
    )


def test_freshness_report_uses_boundary_and_groups_module_version() -> None:
    report = freshness_report(module_fixture(), version=7, as_of=date(2026, 4, 2))

    assert report.phase_id == "relocation"
    assert report.version == 7
    assert report.stale_count == 1
    assert [item.concern_id for item in report.items if item.stale] == ["stale-item"]
    assert report.items[0].days_since_review == 0


def test_stale_reporting_does_not_change_module_content() -> None:
    module = module_fixture()
    before = module.model_dump()

    freshness_report(module, version=1, as_of=date(2026, 7, 1))

    assert module.model_dump() == before
