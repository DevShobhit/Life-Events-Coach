import re
from dataclasses import dataclass

from app.modules.phases.schemas import Citation, CuratedAnswer, PhaseModule


class AskMode:
    CURATED = "curated"


@dataclass(frozen=True)
class CuratedMatch:
    mode: str
    phase_id: str
    version: int
    answer: str
    citations: list[Citation]
    answer_id: str


def normalize_question(question: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", question.lower())).strip()


def match_curated(
    module: PhaseModule, *, version: int, question: str
) -> CuratedMatch | None:
    normalized = normalize_question(question)
    if not normalized:
        return None
    query_words = set(normalized.split())
    candidates: list[tuple[float, str, CuratedAnswer]] = []
    for answer in module.qa_bank:
        answer_words = set(normalize_question(answer.question).split())
        overlap = len(query_words & answer_words) / max(len(query_words), 1)
        if normalized == normalize_question(answer.question):
            overlap = 1.0
        if overlap >= 0.5:
            candidates.append((overlap, answer.id, answer))
    if not candidates:
        return None
    _, _, answer = max(candidates, key=lambda candidate: (candidate[0], candidate[1]))
    return CuratedMatch(
        mode=AskMode.CURATED,
        phase_id=module.phase_id,
        version=version,
        answer=answer.answer,
        citations=answer.citations,
        answer_id=answer.id,
    )
