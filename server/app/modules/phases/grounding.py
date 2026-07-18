import asyncio
import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from pydantic import BaseModel

from app.modules.phases.schemas import Citation, PhaseModule


class GroundedMode(StrEnum):
    GROUNDED = "grounded"
    REFUSAL = "refusal"


class GroundingTimeout(TimeoutError):
    pass


@dataclass(frozen=True)
class GroundingSource:
    concern_id: str
    snippet: str
    citation: Citation
    score: float


class GroundedResponse(BaseModel):
    mode: GroundedMode
    phase_id: str
    version: int
    answer: str
    citations: list[Citation]


class GroundingProvider(Protocol):
    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]: ...


def _words(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def retrieve_sources(
    module: PhaseModule, *, question: str, max_results: int = 3
) -> list[GroundingSource]:
    if max_results < 1:
        raise ValueError("max_results must be positive")
    query_words = _words(question)
    if not query_words:
        return []
    matches: list[GroundingSource] = []
    for concern in module.concerns:
        corpus = " ".join([concern.title, *concern.bullets, concern.why_now])
        score = len(query_words & _words(corpus)) / len(query_words)
        if score >= 0.5:
            matches.append(
                GroundingSource(
                    concern_id=concern.id,
                    snippet=concern.card.body,
                    citation=concern.citation,
                    score=score,
                )
            )
    return sorted(matches, key=lambda source: (-source.score, source.concern_id))[
        :max_results
    ]


class InProcessGroundingProvider:
    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]:
        return retrieve_sources(module, question=question, max_results=max_results)


async def grounded_fallback(
    module: PhaseModule,
    *,
    version: int,
    question: str,
    provider: GroundingProvider | None = None,
    max_results: int = 3,
    timeout_seconds: float = 2.0,
) -> GroundedResponse:
    if timeout_seconds <= 0:
        raise ValueError("timeout_seconds must be positive")
    selected_provider = provider or InProcessGroundingProvider()
    try:
        sources = await asyncio.wait_for(
            selected_provider.retrieve(module, question, max_results),
            timeout=timeout_seconds,
        )
    except TimeoutError as error:
        raise GroundingTimeout("grounding provider timed out") from error
    if not sources or any(source.citation is None for source in sources):
        return GroundedResponse(
            mode=GroundedMode.REFUSAL,
            phase_id=module.phase_id,
            version=version,
            answer="I cannot answer that from the approved sources for this phase.",
            citations=[],
        )
    citations = [source.citation for source in sources]
    snippets = " ".join(source.snippet for source in sources)
    return GroundedResponse(
        mode=GroundedMode.GROUNDED,
        phase_id=module.phase_id,
        version=version,
        answer=f"Based on approved phase sources: {snippets}",
        citations=citations,
    )
