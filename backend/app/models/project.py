"""Project models: Project, assignments, estimates, stock, phases, documents."""

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    planning = "planning"
    active = "active"
    completed = "completed"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    client_name: Mapped[str] = mapped_column(String(300), nullable=False)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    budget: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus),
        default=ProjectStatus.draft,
        nullable=False
    )
    project_manager_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    site_engineer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by: Mapped[int | None] = mapped_column(
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
    project_manager = relationship("User", foreign_keys=[project_manager_id])
    site_engineer = relationship("User", foreign_keys=[site_engineer_id])
    worker_assignments = relationship("ProjectWorkerAssignment", back_populates="project", lazy="selectin")
    material_estimates = relationship("ProjectMaterialEstimate", back_populates="project", lazy="selectin")
    material_stocks = relationship("ProjectMaterialStock", back_populates="project", lazy="selectin")
    phases = relationship("ProjectPhase", back_populates="project", lazy="selectin", order_by="ProjectPhase.order")
    documents = relationship("ProjectDocument", back_populates="project", lazy="selectin")


class ProjectWorkerAssignment(Base):
    __tablename__ = "project_worker_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workers.id"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    released_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="worker_assignments")
    worker = relationship("Worker")


class ProjectMaterialEstimate(Base):
    __tablename__ = "project_material_estimates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("material_catalog.id"), nullable=False
    )
    estimated_quantity: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("project_id", "material_id", name="uq_project_material_estimate"),
    )

    # Relationships
    project = relationship("Project", back_populates="material_estimates")
    material = relationship("MaterialCatalog")


class ProjectMaterialStock(Base):
    __tablename__ = "project_material_stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("material_catalog.id"), nullable=False
    )
    quantity_available: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    quantity_used: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("project_id", "material_id", name="uq_project_material_stock"),
    )

    # Relationships
    project = relationship("Project", back_populates="material_stocks")
    material = relationship("MaterialCatalog")


class PhaseStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class ProjectPhase(Base):
    __tablename__ = "project_phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PhaseStatus] = mapped_column(
        Enum(PhaseStatus),
        default=PhaseStatus.pending,
        nullable=False
    )
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="phases")


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="documents")
    uploader = relationship("User")
