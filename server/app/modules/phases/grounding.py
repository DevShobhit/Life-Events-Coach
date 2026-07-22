import asyncio
import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

import httpx
import structlog
from pydantic import BaseModel, ValidationError

from app.modules.phases.schemas import Citation, PhaseModule


class GroundedMode(StrEnum):
    GROUNDED = "grounded"
    REFUSAL = "refusal"


class GroundingTimeout(TimeoutError):
    pass


logger = structlog.get_logger()


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


class HttpGroundingProvider:
    """Retrieve approved-source matches from a configured provider."""

    def __init__(
        self,
        base_url: str,
        *,
        token: str | None = None,
        timeout_seconds: float = 2.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not base_url:
            raise ValueError("grounding provider URL must not be empty")
        if timeout_seconds <= 0:
            raise ValueError("grounding provider timeout must be positive")
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    async def healthcheck(self) -> bool:
        try:
            headers = self._headers()
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds, transport=self._transport
            ) as client:
                response = await client.get(f"{self._base_url}/health", headers=headers)
                return response.is_success
        except Exception:
            return False

    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]:
        async with httpx.AsyncClient(
            timeout=self._timeout_seconds, transport=self._transport
        ) as client:
            response = await client.post(
                f"{self._base_url}/retrieve",
                json={
                    "phase_id": module.phase_id,
                    "question": question,
                    "max_results": max_results,
                },
                headers=self._headers(),
            )
            response.raise_for_status()
            payload = response.json()
        allowed = {concern.citation.id: concern.id for concern in module.concerns}
        sources: list[GroundingSource] = []
        for item in payload.get("sources", []):
            try:
                citation = Citation.model_validate(item["citation"])
            except (KeyError, TypeError, ValidationError):
                continue
            concern_id = allowed.get(citation.id)
            if concern_id is None:
                continue
            sources.append(
                GroundingSource(
                    concern_id=concern_id,
                    snippet=str(item.get("snippet", "")),
                    citation=citation,
                    score=float(item.get("score", 0)),
                )
            )
        return sources[:max_results]

    def _headers(self) -> dict[str, str]:
        return (
            {"Authorization": f"Bearer {self._token}"}
            if self._token
            else {}
        )


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
    async def healthcheck(self) -> bool:
        return True

    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]:
        return retrieve_sources(module, question=question, max_results=max_results)


class ResilientGroundingProvider:
    """Bound a primary retriever to a phase-approved local fallback."""

    def __init__(
        self,
        *,
        primary: GroundingProvider,
        fallback: GroundingProvider,
        timeout_seconds: float = 2.0,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("grounding provider timeout must be positive")
        self._primary = primary
        self._fallback = fallback
        self._timeout_seconds = timeout_seconds

    async def healthcheck(self) -> bool:
        healthcheck = getattr(self._primary, "healthcheck", None)
        if healthcheck is None:
            return True
        try:
            return await asyncio.wait_for(
                healthcheck(), timeout=self._timeout_seconds
            )
        except Exception:
            return False

    async def retrieve(
        self, module: PhaseModule, question: str, max_results: int
    ) -> list[GroundingSource]:
        try:
            sources = await asyncio.wait_for(
                self._primary.retrieve(module, question, max_results),
                timeout=self._timeout_seconds,
            )
            if sources:
                return sources
            logger.info(
                "grounding.primary.empty",
                phase_id=module.phase_id,
                max_results=max_results,
            )
        except TimeoutError:
            logger.warning(
                "grounding.primary.timeout",
                phase_id=module.phase_id,
                timeout_seconds=self._timeout_seconds,
            )
        except Exception:
            logger.warning(
                "grounding.primary.failed",
                phase_id=module.phase_id,
                exc_info=True,
            )
        return await self._fallback.retrieve(module, question, max_results)


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
