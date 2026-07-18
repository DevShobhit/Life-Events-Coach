from dataclasses import dataclass
from datetime import date

from app.modules.phases.schemas import Concern


@dataclass(frozen=True)
class RankRequest:
    today: date
    stage: str
    handled_ids: frozenset[str] = frozenset()
    now_window_days: int = 7
    horizon_days: int = 90


@dataclass(frozen=True)
class RankedConcern:
    concern: Concern
    view: str
    reason: str


def rank_concerns(concerns: list[Concern], request: RankRequest) -> list[RankedConcern]:
    eligible: list[RankedConcern] = []
    for item in concerns:
        if item.id in request.handled_ids:
            continue
        if item.available_stages and request.stage not in item.available_stages:
            continue
        if item.horizon_days <= request.now_window_days:
            view = "now"
            reason = "eligible in the current action window"
        elif item.hidden_factor or item.horizon_days <= request.horizon_days:
            view = "horizon"
            reason = (
                "hidden factor surfaced early"
                if item.hidden_factor and item.horizon_days > request.horizon_days
                else "eligible in the configured horizon"
            )
        else:
            continue
        eligible.append(RankedConcern(item, view, reason))

    return sorted(
        eligible,
        key=lambda ranked: (
            -ranked.concern.urgency,
            ranked.concern.horizon_days,
            ranked.concern.id,
        ),
    )
