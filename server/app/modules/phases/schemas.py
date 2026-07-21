from datetime import date, datetime
from enum import StrEnum
from typing import Literal, Self

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator, model_validator


class SourceType(StrEnum):
    GOVERNMENT_PORTAL = "government_portal"
    VERIFIED_EXPERT = "verified_expert"
    CLINICAL_GUIDELINE = "clinical_guideline"
    LICENSING_BODY = "licensing_body"


class Citation(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    url: AnyHttpUrl
    source_type: SourceType
    reviewed_on: date


class CardContent(BaseModel):
    visual_url: AnyHttpUrl | None = None
    body: str = Field(min_length=1, max_length=2000)


class Concern(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    content_category: str | None = Field(default=None, max_length=100)
    urgency: int = Field(ge=0, le=100)
    horizon_days: int = Field(ge=0)
    hidden_factor: bool = False
    available_stages: list[str] = Field(default_factory=list)
    bullets: list[str] = Field(min_length=1, max_length=5)
    why_now: str = Field(min_length=1, max_length=300)
    citation: Citation
    card: CardContent


class AdaptiveThresholds(BaseModel):
    skip_count_for_relevance_check: int = Field(default=2, ge=1)
    freshness_days: int = Field(default=90, ge=1)


class CuratedAnswer(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=4000)
    citations: list[Citation] = Field(min_length=1)


class Enrollment(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    phase_id: str = Field(min_length=1, max_length=100)
    context: dict[str, str] = Field(default_factory=dict)
    progress_anchor: date = Field(default_factory=date.today)
    status: Literal["active", "completed", "archived"] = "active"
    completed_at: datetime | None = None
    archived_at: datetime | None = None


class EnrollmentLifecycleEvent(BaseModel):
    event: Literal["completed", "archived"]
    occurred_at: datetime


class CardProgress(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    concern_id: str = Field(min_length=1, max_length=100)
    status: str = Field(pattern="^(pending|done|skipped|already_handled|not_relevant)$")
    skip_count: int = Field(default=0, ge=0)


class OnboardingField(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    required: bool = False


class PhaseModule(BaseModel):
    schema_version: str
    phase_id: str = Field(min_length=1, max_length=100)
    display_name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    source_policy: list[SourceType] = Field(min_length=1)
    onboarding_fields: list[str] = Field(default_factory=list)
    onboarding_field_metadata: list[OnboardingField] = Field(default_factory=list)
    thresholds: AdaptiveThresholds = Field(default_factory=AdaptiveThresholds)
    concerns: list[Concern] = Field(min_length=1)
    qa_bank: list[CuratedAnswer] = Field(default_factory=list)

    @field_validator("schema_version")
    @classmethod
    def supported_schema_version(cls, value: str) -> str:
        if value != "1.0":
            raise ValueError("schema_version must be 1.0")
        return value

    @model_validator(mode="after")
    def validate_module(self) -> Self:
        concern_ids = [concern.id for concern in self.concerns]
        if len(concern_ids) != len(set(concern_ids)):
            raise ValueError("concern IDs must be unique")
        for concern in self.concerns:
            if concern.citation.source_type not in self.source_policy:
                raise ValueError(
                    f"citation source_type is not in source_policy: {concern.id}"
                )
        metadata_keys = [field.key for field in self.onboarding_field_metadata]
        if len(metadata_keys) != len(set(metadata_keys)):
            raise ValueError("onboarding field metadata keys must be unique")
        if set(metadata_keys) - set(self.onboarding_fields):
            raise ValueError(
                "onboarding field metadata must reference configured fields"
            )
        return self
