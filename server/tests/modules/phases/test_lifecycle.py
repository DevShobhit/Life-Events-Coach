import pytest
from app.modules.phases.lifecycle import (
    CardAction,
    CardState,
    TransitionError,
    apply_action,
)


def test_done_hides_the_card() -> None:
    result = apply_action(CardState(), CardAction.DONE, skip_threshold=2)

    assert result.status == "done"
    assert result.skip_count == 0


def test_two_skips_queue_a_relevance_check() -> None:
    state = CardState(skip_count=1)

    result = apply_action(state, CardAction.SKIP, skip_threshold=2)

    assert result.status == "relevance_check"
    assert result.skip_count == 2


def test_relevance_check_can_requeue_or_remove_the_card() -> None:
    state = CardState(status="relevance_check", skip_count=2)

    assert (
        apply_action(state, CardAction.RELEVANT, skip_threshold=2).status == "pending"
    )
    assert (
        apply_action(state, CardAction.NOT_RELEVANT, skip_threshold=2).status
        == "not_relevant"
    )


def test_already_handled_is_permanent_and_rejects_later_actions() -> None:
    state = apply_action(CardState(), CardAction.ALREADY_HANDLED, skip_threshold=2)

    assert state.status == "already_handled"
    with pytest.raises(TransitionError, match="already handled"):
        apply_action(state, CardAction.DONE, skip_threshold=2)
