from app.modules.phases.cache import ActivePhaseModuleCache
from app.modules.phases.schemas import PhaseModule


def module_fixture() -> PhaseModule:
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "relocation",
            "source_policy": ["government_portal"],
            "concerns": [
                {
                    "id": "documents",
                    "title": "Documents",
                    "urgency": 1,
                    "horizon_days": 1,
                    "bullets": ["Keep records"],
                    "why_now": "They matter.",
                    "citation": {
                        "id": "documents-source",
                        "title": "Official guidance",
                        "url": "https://example.gov/documents",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "Keep records."},
                }
            ],
        }
    )


def test_cache_hit_expiry_and_invalidation() -> None:
    now = [0.0]
    cache = ActivePhaseModuleCache(ttl_seconds=10, clock=lambda: now[0])
    module = module_fixture()
    cache.put("relocation", version=3, module=module)

    fresh = cache.get("relocation")
    assert fresh is not None
    assert fresh.version == 3
    now[0] = 10.0
    assert cache.get("relocation") is None
    stale = cache.get_stale("relocation")
    assert stale is not None
    assert stale.version == 3
    cache.invalidate("relocation")
    assert cache.get_stale("relocation") is None
