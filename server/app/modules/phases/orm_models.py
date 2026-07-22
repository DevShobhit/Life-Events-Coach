from datetime import date, datetime, time
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Time, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON


class Base(DeclarativeBase):
    pass


JsonType = JSON().with_variant(JSONB, "postgresql")


class PhaseModuleVersion(Base):
    __tablename__ = "phase_module_versions"

    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="published")
    content: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PhaseModuleActive(Base):
    __tablename__ = "phase_module_active"

    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)


class PhaseModuleDraft(Base):
    __tablename__ = "phase_module_drafts"

    draft_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    base_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False)
    validation_report: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    published_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class EditorialAuditEventRecord(Base):
    __tablename__ = "editorial_audit_events"

    event_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    draft_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    event: Mapped[str] = mapped_column(String(30), nullable=False)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class EditorialPublicationIdempotencyRecord(Base):
    __tablename__ = "editorial_publication_idempotency"

    idempotency_key: Mapped[str] = mapped_column(String(150), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), nullable=False)
    draft_id: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    response: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PhaseEnrollment(Base):
    __tablename__ = "phase_enrollments"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    context: Mapped[dict[str, str]] = mapped_column(
        JsonType, nullable=False, default=dict
    )
    progress_anchor: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CardProgressRecord(Base):
    __tablename__ = "card_progress"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    concern_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    skip_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class CardActionRecord(Base):
    __tablename__ = "card_actions"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    concern_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    idempotency_key: Mapped[str] = mapped_column(String(150), primary_key=True)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    resulting_status: Mapped[str] = mapped_column(String(30), nullable=False)
    skip_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class NotificationPreferenceRecord(Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="UTC")
    local_time: Mapped[time] = mapped_column(Time, nullable=False)
    delivery_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="not_configured"
    )
    last_delivery_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class NotificationIntentRecord(Base):
    __tablename__ = "notification_intents"

    dedupe_key: Mapped[str] = mapped_column(String(200), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    local_day: Mapped[date] = mapped_column(Date, nullable=False)
    phase_ids: Mapped[list[str]] = mapped_column(JsonType, nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False, default="due")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PhaseLifecycleEventRecord(Base):
    __tablename__ = "phase_lifecycle_events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    phase_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event: Mapped[str] = mapped_column(String(20), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
