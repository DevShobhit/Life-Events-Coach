from app.modules.phases.ask import match_curated, normalize_question
from app.modules.phases.schemas import PhaseModule


def module_with_answers(phase_id: str = "relocation") -> PhaseModule:
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": phase_id,
            "source_policy": ["government_portal"],
            "concerns": [
                {
                    "id": "one",
                    "title": "One",
                    "urgency": 1,
                    "horizon_days": 1,
                    "bullets": ["One"],
                    "why_now": "Now",
                    "citation": {
                        "id": "c1",
                        "title": "Official source",
                        "url": "https://example.gov/one",
                        "source_type": "government_portal",
                        "reviewed_on": "2026-07-01",
                    },
                    "card": {"body": "One"},
                }
            ],
            "qa_bank": [
                {
                    "id": "visa",
                    "question": "What documents do I need for my visa?",
                    "answer": "Check the official visa checklist.",
                    "citations": [
                        {
                            "id": "visa-source",
                            "title": "Visa checklist",
                            "url": "https://example.gov/visa",
                            "source_type": "government_portal",
                            "reviewed_on": "2026-07-01",
                        }
                    ],
                }
            ],
        }
    )


def test_question_normalization_is_case_and_punctuation_insensitive() -> None:
    assert (
        normalize_question("  What documents do I need? ") == "what documents do i need"
    )


def test_curated_match_returns_reviewed_answer_and_citations() -> None:
    result = match_curated(
        module_with_answers(),
        version=3,
        question="What documents do I need for my visa?",
    )

    assert result is not None
    assert result.mode == "curated"
    assert result.phase_id == "relocation"
    assert result.version == 3
    assert result.citations[0].id == "visa-source"


def test_curated_match_allows_small_wording_variations_deterministically() -> None:
    result = match_curated(
        module_with_answers(), version=1, question="visa documents needed"
    )

    assert result is not None
    assert result.answer == "Check the official visa checklist."


def test_curated_match_returns_none_for_unrelated_questions() -> None:
    assert (
        match_curated(module_with_answers(), version=1, question="Where is my bank?")
        is None
    )


def test_match_is_scoped_to_the_supplied_phase_module() -> None:
    other_phase = module_with_answers("new_parent")

    result = match_curated(
        other_phase, version=1, question="What documents do I need for my visa?"
    )

    assert result is not None
    assert result.phase_id == "new_parent"
