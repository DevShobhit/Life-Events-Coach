from datetime import date

from app.modules.phases.fixtures import LAUNCH_RELOCATION
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.roadmap import (
    InMemoryRoadmapState,
    apply_roadmap_action,
    assemble_roadmap,
)


def test_roadmap_contains_current_card_horizon_groups_and_citations() -> None:
    roadmap = assemble_roadmap(
        LAUNCH_RELOCATION,
        version=1,
        user_id="user-1",
        stage="arrived",
        today=date(2026, 7, 18),
        state=InMemoryRoadmapState(),
    )

    assert roadmap.current is not None
    assert len(roadmap.now) <= 5
    assert roadmap.horizon[0].cards[0].citation_id


def test_action_response_resequences_and_removes_done_card() -> None:
    state = InMemoryRoadmapState()
    initial = assemble_roadmap(
        LAUNCH_RELOCATION,
        version=1,
        user_id="user-1",
        stage="arrived",
        today=date(2026, 7, 18),
        state=state,
    )
    assert initial.current is not None
    concern_id = initial.current.concern_id

    updated = apply_roadmap_action(
        LAUNCH_RELOCATION,
        user_id="user-1",
        concern_id=concern_id,
        action=CardAction.DONE,
        stage="arrived",
        today=date(2026, 7, 18),
        state=state,
    )

    visible_ids = [card.concern_id for card in updated.now]
    visible_ids.extend(
        card.concern_id for group in updated.horizon for card in group.cards
    )
    assert concern_id not in visible_ids
