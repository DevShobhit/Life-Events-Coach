from dataclasses import dataclass, replace
from enum import StrEnum


class CardAction(StrEnum):
    DONE = "done"
    SKIP = "skip"
    ALREADY_HANDLED = "already_handled"
    RELEVANT = "relevant"
    NOT_RELEVANT = "not_relevant"


class TransitionError(ValueError):
    pass


@dataclass(frozen=True)
class CardState:
    status: str = "pending"
    skip_count: int = 0


def apply_action(
    state: CardState, action: CardAction, *, skip_threshold: int
) -> CardState:
    if skip_threshold < 1:
        raise ValueError("skip_threshold must be positive")
    if state.status in {"done", "already_handled", "not_relevant"}:
        status = state.status.replace("_", " ")
        raise TransitionError(f"card is {status} and cannot accept actions")
    if state.status == "relevance_check" and action not in {
        CardAction.RELEVANT,
        CardAction.NOT_RELEVANT,
    }:
        raise TransitionError("relevance check requires relevant or not_relevant")
    if action == CardAction.DONE:
        return replace(state, status="done")
    if action == CardAction.ALREADY_HANDLED:
        return replace(state, status="already_handled")
    if action == CardAction.SKIP:
        skip_count = state.skip_count + 1
        status = "relevance_check" if skip_count >= skip_threshold else "pending"
        return replace(state, status=status, skip_count=skip_count)
    if action == CardAction.RELEVANT:
        return replace(state, status="pending")
    if action == CardAction.NOT_RELEVANT:
        return replace(state, status="not_relevant")
    raise TransitionError(f"unsupported action: {action}")
