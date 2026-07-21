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


class PhaseEnrollment(Base):
    __tablename__ = "phase_enrollments"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    context: Mapped[dict[str, str]] = mapped_column(
        JsonType, nullable=False, default=dict
    )
    progress_anchor: Mapped[date] = mapped_column(Date, nullable=False)
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
