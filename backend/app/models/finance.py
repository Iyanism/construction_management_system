"""Finance models: MaterialPurchase, LaborCostEntry, FinancialTransaction."""

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
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TransactionCategory(str, enum.Enum):
    material_purchase = "material_purchase"
    labor_cost = "labor_cost"
    equipment = "equipment"
    transport = "transport"
    miscellaneous = "miscellaneous"
    material_usage = "material_usage"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    partial = "partial"


class MaterialPurchase(Base):
    __tablename__ = "material_purchases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("material_catalog.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    recorded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.paid,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    project = relationship("Project")
    material = relationship("MaterialCatalog")
    recorder = relationship("User")


class LaborCostEntry(Base):
    __tablename__ = "labor_cost_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_workers: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    generated_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("project_id", "date", name="uq_labor_cost_per_day"),
    )

    # Relationships
    project = relationship("Project")
    generator = relationship("User")


class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False
    )
    category: Mapped[TransactionCategory] = mapped_column(
        Enum(TransactionCategory),
        nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.pending,
        nullable=False
    )
    source_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # "material_purchase", "labor_cost", "material_usage"
    recorded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    override_flag: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    original_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    recorder = relationship("User")
