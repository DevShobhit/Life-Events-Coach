from datetime import date

from pydantic import BaseModel

from app.modules.phases.schemas import PhaseModule


class FreshnessItem(BaseModel):
    concern_id: str
    citation_id: str
    reviewed_on: date
    days_since_review: int
    stale: bool


class FreshnessReport(BaseModel):
    phase_id: str
    version: int
    as_of: date
    freshness_days: int
    stale_count: int
    items: list[FreshnessItem]


def freshness_report(
    module: PhaseModule, *, version: int, as_of: date
) -> FreshnessReport:
    threshold = module.thresholds.freshness_days
    items = [
        FreshnessItem(
            concern_id=concern.id,
            citation_id=concern.citation.id,
            reviewed_on=concern.citation.reviewed_on,
            days_since_review=(as_of - concern.citation.reviewed_on).days,
            stale=(as_of - concern.citation.reviewed_on).days >= threshold,
        )
        for concern in module.concerns
    ]
    return FreshnessReport(
        phase_id=module.phase_id,
        version=version,
        as_of=as_of,
        freshness_days=threshold,
        stale_count=sum(item.stale for item in items),
        items=items,
    )
