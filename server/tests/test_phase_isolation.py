from datetime import date

from app.modules.phases.ask import match_curated
from app.modules.phases.fixtures import LAUNCH_RELOCATION, SECOND_PHASE
from app.modules.phases.roadmap import InMemoryRoadmapState, assemble_roadmap


def test_second_phase_uses_its_own_timing_and_content() -> None:
    result = assemble_roadmap(
        SECOND_PHASE,
        version=1,
        user_id="user-1",
        stage="preparing",
        today=date(2026, 7, 21),
        state=InMemoryRoadmapState(),
    )

    assert result.phase_id == "new_parent"
    assert result.now
    assert all(card.concern_id.startswith("parenting-") for card in result.now)
    assert all(card.horizon_days <= 60 for group in result.horizon for card in group.cards)


def test_curated_ask_matches_only_the_selected_phase_module() -> None:
    question = LAUNCH_RELOCATION.qa_bank[0].question
    relocation_match = match_curated(LAUNCH_RELOCATION, version=1, question=question)
    parent_match = match_curated(SECOND_PHASE, version=1, question=question)

    assert relocation_match is not None
    assert relocation_match.phase_id == "relocation"
    assert parent_match is not None
    assert parent_match.phase_id == "new_parent"
    assert parent_match.answer_id != relocation_match.answer_id
