from datetime import date

import pytest

from app.modules.phases.enrollment import validate_enrollment
from app.modules.phases.fixtures import LAUNCH_RELOCATION


def test_validate_enrollment_accepts_configured_context_and_anchor() -> None:
    result = validate_enrollment(
        LAUNCH_RELOCATION,
        user_id="u",
        phase_id="relocation",
        context={
            "origin_country": "IN",
            "destination_country": "US",
            "relocation_stage": "arrived",
        },
        progress_anchor=date(2026, 7, 19),
    )
    assert result.progress_anchor == date(2026, 7, 19)


@pytest.mark.parametrize(
    "context, message",
    [
        ({"unknown": "x"}, "unknown enrollment field"),
        ({"origin_country": "IN"}, "missing required enrollment field"),
    ],
)
def test_validate_enrollment_rejects_invalid_context(
    context: dict[str, str], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        validate_enrollment(
            LAUNCH_RELOCATION,
            user_id="u",
            phase_id="relocation",
            context=context,
            progress_anchor=date.today(),
        )
