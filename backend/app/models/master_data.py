"""Master data models: WorkerRole, WageRate, MaterialCatalog, Worker."""

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkerRole(Base):
    __tablename__ = "worker_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    wage_rates = relationship("WageRate", back_populates="worker_role", lazy="selectin")
    workers = relationship("Worker", back_populates="worker_role", lazy="selectin")


class WageRate(Base):
    __tablename__ = "wage_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    worker_role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("worker_roles.id"), nullable=False
    )
    daily_rate: Mapped[float] = mapped_column(Float, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    worker_role = relationship("WorkerRole", back_populates="wage_rates")


class MaterialCatalog(Base):
    __tablename__ = "material_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)  # kg, bags, pieces, cubic meters, etc.
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # Cement, Steel, Aggregate, etc.


class WorkerStatus(str, enum.Enum):
    available = "available"
    assigned = "assigned"


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    worker_role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("worker_roles.id"), nullable=False
    )
    status: Mapped[WorkerStatus] = mapped_column(
        Enum(WorkerStatus), default=WorkerStatus.available, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    worker_role = relationship("WorkerRole", back_populates="workers")
