from pydantic import BaseModel, Field

from app.modules.phases.ask import match_curated
from app.modules.phases.grounding import (
    GroundedMode,
    GroundingProvider,
    grounded_fallback,
)
from app.modules.phases.schemas import Citation, PhaseModule


class RoadmapProposal(BaseModel):
    concern_id: str
    title: str
    status: str = "proposed"


class AskResponse(BaseModel):
    mode: str
    phase_id: str
    version: int
    answer: str
    citations: list[Citation]
    answer_id: str | None = None
    roadmap_proposal: RoadmapProposal | None = None


class RoadmapFoldRequest(BaseModel):
    confirm: bool = Field(description="Must be true to record the explicit fold")
    stage: str = "arrived"
    idempotency_key: str = Field(min_length=1, max_length=100)


async def answer_question(
    module: PhaseModule,
    *,
    version: int,
    question: str,
    provider: GroundingProvider | None = None,
) -> AskResponse:
    curated = match_curated(module, version=version, question=question)
    if curated is not None:
        return AskResponse(
            mode=curated.mode,
            phase_id=curated.phase_id,
            version=curated.version,
            answer=curated.answer,
            citations=curated.citations,
            answer_id=curated.answer_id,
        )

    grounded = await grounded_fallback(
        module,
        version=version,
        question=question,
        provider=provider,
    )
    proposal = None
    if grounded.mode == GroundedMode.GROUNDED:
        sources = set()
        for concern in module.concerns:
            if concern.citation.id in {citation.id for citation in grounded.citations}:
                sources.add(concern.id)
        if len(sources) == 1:
            concern_id = next(iter(sources))
            concern = next(item for item in module.concerns if item.id == concern_id)
            proposal = RoadmapProposal(concern_id=concern.id, title=concern.title)
    return AskResponse(
        mode=grounded.mode.value,
        phase_id=grounded.phase_id,
        version=grounded.version,
        answer=grounded.answer,
        citations=grounded.citations,
        roadmap_proposal=proposal,
    )
