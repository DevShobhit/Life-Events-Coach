from dataclasses import dataclass, field
from datetime import date

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.action_repository import CardActionRepository
from app.modules.phases.enrollment_repository import EnrollmentRepository
from app.modules.phases.lifecycle import CardAction, CardState, apply_action
from app.modules.phases.orm_models import CardProgressRecord
from app.modules.phases.priority import RankedConcern, RankRequest, rank_concerns
from app.modules.phases.schemas import PhaseModule


class RoadmapCard(BaseModel):
    concern_id: str
    title: str
    view: str
    horizon_days: int
    hidden_factor: bool
    bullets: list[str]
    why_now: str
    body: str
    visual_url: str | None
    citation_id: str
    citation_title: str
    citation_url: str
    citation_source_type: str
    citation_reviewed_on: date
    citation_days_since_review: int
    citation_stale: bool
    reason: str


class HorizonGroup(BaseModel):
    horizon_days: int
    cards: list[RoadmapCard]


class RoadmapResponse(BaseModel):
    phase_id: str
    version: int
    now: list[RoadmapCard] = Field(max_length=5)
    current: RoadmapCard | None
    horizon: list[HorizonGroup]


@dataclass
class InMemoryRoadmapState:
    progress: dict[tuple[str, str, str], CardState] = field(default_factory=dict)


def assemble_roadmap(
    module: PhaseModule,
    *,
    version: int,
    user_id: str,
    stage: str,
    today: date,
    state: InMemoryRoadmapState,
) -> RoadmapResponse:
    progress = {
        concern_id: value
        for (stored_user, stored_phase, concern_id), value in state.progress.items()
        if stored_user == user_id and stored_phase == module.phase_id
    }
    handled = frozenset(
        concern_id
        for concern_id, value in progress.items()
        if value.status in {"done", "already_handled", "not_relevant"}
    )
    ranked = rank_concerns(
        module.concerns,
        RankRequest(
            today=today,
            stage=stage,
            handled_ids=handled,
            now_window_days=7,
            horizon_days=90,
        ),
    )

    def to_card(item: RankedConcern) -> RoadmapCard:
        return RoadmapCard(
            concern_id=item.concern.id,
            title=item.concern.title,
            view=item.view,
            horizon_days=item.concern.horizon_days,
            hidden_factor=item.concern.hidden_factor,
            bullets=item.concern.bullets,
            why_now=item.concern.why_now,
            body=item.concern.card.body,
            visual_url=(
                str(item.concern.card.visual_url)
                if item.concern.card.visual_url is not None
                else None
            ),
            citation_id=item.concern.citation.id,
            citation_title=item.concern.citation.title,
            citation_url=str(item.concern.citation.url),
            citation_source_type=item.concern.citation.source_type.value,
            citation_reviewed_on=item.concern.citation.reviewed_on,
            citation_days_since_review=(today - item.concern.citation.reviewed_on).days,
            citation_stale=(
                today - item.concern.citation.reviewed_on
            ).days
            >= module.thresholds.freshness_days,
            reason=item.reason,
        )

    cards = [to_card(item) for item in ranked]
    now = [card for card in cards if card.view == "now"][:5]
    horizon_cards = [card for card in cards if card.view == "horizon"]
    groups: dict[int, list[RoadmapCard]] = {}
    for card in horizon_cards:
        groups.setdefault(card.horizon_days, []).append(card)
    return RoadmapResponse(
        phase_id=module.phase_id,
        version=version,
        now=now,
        current=now[0] if now else None,
        horizon=[
            HorizonGroup(horizon_days=days, cards=groups[days])
            for days in sorted(groups)
        ],
    )


def apply_roadmap_action(
    module: PhaseModule,
    *,
    user_id: str,
    concern_id: str,
    action: CardAction,
    stage: str,
    today: date,
    state: InMemoryRoadmapState,
) -> RoadmapResponse:
    concern = next((item for item in module.concerns if item.id == concern_id), None)
    if concern is None:
        raise ValueError("concern not found")
    key = (user_id, module.phase_id, concern_id)
    current = state.progress.get(key, CardState())
    state.progress[key] = apply_action(
        current,
        action,
        skip_threshold=module.thresholds.skip_count_for_relevance_check,
    )
    return assemble_roadmap(
        module,
        version=1,
        user_id=user_id,
        stage=stage,
        today=today,
        state=state,
    )


async def load_persistent_state(
    session: AsyncSession, *, user_id: str, phase_id: str
) -> InMemoryRoadmapState:
    result = await session.execute(
        select(CardProgressRecord).where(
            CardProgressRecord.user_id == user_id,
            CardProgressRecord.phase_id == phase_id,
        )
    )
    return InMemoryRoadmapState(
        progress={
            (user_id, phase_id, record.concern_id): CardState(
                status=record.status,
                skip_count=record.skip_count,
            )
            for record in result.scalars()
        }
    )


async def persistent_roadmap(
    session: AsyncSession,
    module: PhaseModule,
    *,
    version: int,
    user_id: str,
    stage: str,
    today: date,
) -> RoadmapResponse:
    enrollment = await EnrollmentRepository(session).get(user_id, module.phase_id)
    if enrollment is not None:
        stage = next(
            (value for key, value in enrollment.context.items() if "stage" in key),
            stage,
        )
        today = enrollment.progress_anchor
    state = await load_persistent_state(
        session, user_id=user_id, phase_id=module.phase_id
    )
    return assemble_roadmap(
        module,
        version=version,
        user_id=user_id,
        stage=stage,
        today=today,
        state=state,
    )


async def apply_persistent_action(
    session: AsyncSession,
    module: PhaseModule,
    *,
    version: int,
    user_id: str,
    concern_id: str,
    action: CardAction,
    stage: str,
    idempotency_key: str,
    today: date,
) -> RoadmapResponse:
    if not any(concern.id == concern_id for concern in module.concerns):
        raise ValueError("concern not found")
    await CardActionRepository(session).apply(
        user_id=user_id,
        phase_id=module.phase_id,
        concern_id=concern_id,
        action=action,
        skip_threshold=module.thresholds.skip_count_for_relevance_check,
        idempotency_key=idempotency_key,
    )
    enrollment = await EnrollmentRepository(session).get(user_id, module.phase_id)
    if enrollment is not None:
        stage = next(
            (value for key, value in enrollment.context.items() if "stage" in key),
            stage,
        )
        today = enrollment.progress_anchor
    return await persistent_roadmap(
        session,
        module,
        version=version,
        user_id=user_id,
        stage=stage,
        today=today,
    )
