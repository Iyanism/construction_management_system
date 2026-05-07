"""Daily operations models: Attendance, DailyLog, MaterialUsage, MaterialRequest."""

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workers.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus),
        nullable=False
    )
    marked_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("project_id", "worker_id", "date", name="uq_attendance_per_day"),
    )

    # Relationships
    project = relationship("Project")
    worker = relationship("Worker")
    marker = relationship("User")


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    phase_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("project_phases.id"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("project_id", "date", name="uq_daily_log_per_day"),
    )

    # Relationships
    project = relationship("Project")
    creator = relationship("User")
    phase = relationship("ProjectPhase")


class MaterialUsage(Base):
    __tablename__ = "material_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("material_catalog.id"), nullable=False
    )
    quantity_used: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    recorded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    phase_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("project_phases.id"), nullable=True
    )

    # Relationships
    project = relationship("Project")
    material = relationship("MaterialCatalog")
    recorder = relationship("User")
    phase = relationship("ProjectPhase")


class MaterialRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    fulfilled = "fulfilled"


class MaterialRequest(Base):
    __tablename__ = "material_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("material_catalog.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[MaterialRequestStatus] = mapped_column(
        Enum(MaterialRequestStatus),
        default=MaterialRequestStatus.pending,
        nullable=False
    )
    requested_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project = relationship("Project")
    material = relationship("MaterialCatalog")
    requester = relationship("User", foreign_keys=[requested_by])
    approver = relationship("User", foreign_keys=[approved_by])
