from datetime import date
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.orm_models import (
    EditorialAuditEventRecord,
    PhaseModuleActive,
    PhaseModuleDraft,
    PhaseModuleVersion,
)
from app.modules.phases.publication import PhaseModuleCache, PhaseModulePublisher
from app.modules.phases.repository import PhaseModuleRepository, session_transaction
from app.modules.phases.schemas import PhaseModule


async def active_version(session: AsyncSession, phase_id: str) -> int | None:
    active = await session.get(PhaseModuleActive, phase_id)
    return active.version if active else None


async def create_draft(
    session: AsyncSession, *, phase_id: str, content: dict[str, Any], actor_id: str
) -> PhaseModuleDraft:
    module = PhaseModule.model_validate(content)
    if module.phase_id != phase_id:
        raise ValueError("module phase does not match route phase")
    draft = PhaseModuleDraft(
        draft_id=str(uuid4()), phase_id=phase_id, base_version=await active_version(session, phase_id),
        schema_version=module.schema_version, content=module.model_dump(mode="json"),
        created_by=actor_id, updated_by=actor_id,
    )
    async with session_transaction(session):
        session.add(draft)
        await session.flush()
    return draft


async def get_draft(session: AsyncSession, draft_id: str) -> PhaseModuleDraft | None:
    return await session.get(PhaseModuleDraft, draft_id)


async def list_drafts(session: AsyncSession, phase_id: str) -> list[PhaseModuleDraft]:
    result = await session.execute(
        select(PhaseModuleDraft).where(PhaseModuleDraft.phase_id == phase_id).order_by(PhaseModuleDraft.updated_at.desc())
    )
    return list(result.scalars().all())


async def update_draft(
    session: AsyncSession, draft: PhaseModuleDraft, *, content: dict[str, Any], actor_id: str, expected_revision: int
) -> PhaseModuleDraft:
    if draft.revision != expected_revision or draft.status in {"published", "abandoned"}:
        raise RuntimeError("draft revision conflict")
    module = PhaseModule.model_validate(content)
    if module.phase_id != draft.phase_id:
        raise ValueError("module phase does not match route phase")
    async with session_transaction(session):
        draft.content = module.model_dump(mode="json")
        draft.schema_version = module.schema_version
        draft.revision += 1
        draft.updated_by = actor_id
        draft.status = "draft"
        draft.validation_report = None
        await session.flush()
    return draft


async def validate_draft(session: AsyncSession, draft: PhaseModuleDraft, *, production: bool) -> dict[str, list[str]]:
    try:
        publisher = PhaseModulePublisher(PhaseModuleRepository(session), PhaseModuleCache())
        module = PhaseModule.model_validate(draft.content)
        errors = publisher  # keep validation rules centralized below
        del errors
        from app.modules.phases.publication import validate_launch_content
        report = validate_launch_content(module, production=production)
        for concern in module.concerns:
            if concern.citation.reviewed_on > date.today():
                report.setdefault("reviewed_on", []).append(f"citation {concern.citation.id} cannot be reviewed in the future")
    except Exception as error:
        report = {"content": [str(error)]}
    async with session_transaction(session):
        draft.validation_report = report
        draft.status = "validated" if not report else "draft"
        await session.flush()
    return report


async def next_version(session: AsyncSession, phase_id: str) -> int:
    result = await session.execute(
        select(PhaseModuleVersion.version).where(PhaseModuleVersion.phase_id == phase_id).order_by(PhaseModuleVersion.version.desc())
    )
    current = result.scalars().first()
    return (current or 0) + 1


async def record_audit(
    session: AsyncSession, *, phase_id: str, actor_id: str, actor_role: str, event: str,
    draft_id: str | None = None, version: int | None = None, request_id: str | None = None,
) -> None:
    session.add(EditorialAuditEventRecord(
        event_id=str(uuid4()), phase_id=phase_id, draft_id=draft_id, version=version,
        actor_id=actor_id, actor_role=actor_role, event=event, request_id=request_id,
    ))
