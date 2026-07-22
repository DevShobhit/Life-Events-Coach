from app.modules.phases.fixtures import PRODUCTION_LAUNCH_RELOCATION
from app.modules.phases.publication import validate_launch_content


def test_production_relocation_bank_has_reviewed_40_to_60_concerns() -> None:
    module = PRODUCTION_LAUNCH_RELOCATION

    assert 40 <= len(module.concerns) <= 60
    assert len({item.id for item in module.concerns}) == len(module.concerns)
    assert len({item.citation.id for item in module.concerns}) == len(module.concerns)
    assert all(item.jurisdiction_scope for item in module.concerns)
    assert all("example.gov" not in str(item.citation.url) for item in module.concerns)
    assert validate_launch_content(module) == {}
