"""Pydantic schemas for finance: MaterialPurchase, LaborCostEntry, FinancialTransaction."""

from datetime import date, datetime
import datetime as dt
from pydantic import BaseModel


# --- Material Purchase ---

class MaterialPurchaseCreate(BaseModel):
    project_id: int
    material_id: int
    quantity: float
    unit_price: float
    date: date
    payment_status: str = "paid"


class MaterialPurchaseResponse(BaseModel):
    id: int
    project_id: int
    material_id: int
    quantity: float
    unit_price: float
    total_cost: float
    date: date
    recorded_by: int
    created_at: datetime
    material_name: str | None = None
    material_unit: str | None = None
    project_name: str | None = None
    payment_status: str

    model_config = {"from_attributes": True}


# --- Labor Cost ---

class LaborCostGenerateRequest(BaseModel):
    project_id: int
    date: date


class LaborCostResponse(BaseModel):
    id: int
    project_id: int
    date: date
    total_workers: int
    total_amount: float
    generated_by: int
    created_at: datetime
    project_name: str | None = None

    model_config = {"from_attributes": True}


class LaborCostPreviewResponse(BaseModel):
    project_id: int
    date: date
    total_workers: int
    estimated_amount: float
    is_already_generated: bool


# --- Financial Transaction ---

class TransactionCreate(BaseModel):
    project_id: int
    category: str  # material_purchase, labor_cost, equipment, transport, miscellaneous
    description: str
    amount: float
    date: date
    payment_status: str = "pending"  # pending, paid, partial


class TransactionUpdate(BaseModel):
    description: str | None = None
    amount: float | None = None
    date: dt.date | None = None
    payment_status: str | None = None
    category: str | None = None


class TransactionResponse(BaseModel):
    id: int
    project_id: int
    category: str
    description: str
    amount: float
    date: date
    payment_status: str
    source_id: int | None
    source_type: str | None
    recorded_by: int
    created_at: datetime
    updated_at: datetime
    project_name: str | None = None
    recorder_name: str | None = None
    override_flag: bool = False
    original_amount: float | None = None
    override_reason: str | None = None

    model_config = {"from_attributes": True}


# --- Finance Summary ---

class ProjectFinanceSummary(BaseModel):
    project_id: int
    project_name: str
    budget: float
    total_spent: float
    budget_remaining: float
    budget_utilization_percentage: float
    budget_warning: bool
    by_category: dict[str, float]
    payment_summary: dict[str, float]


class FinanceOverview(BaseModel):
    total_projects: int
    total_active_projects: int
    total_budget: float
    total_spent: float
    total_remaining: float
    global_by_category: dict[str, float]
    projects: list[ProjectFinanceSummary]
    pending_items_count: int = 0
    recent_transactions: list[TransactionResponse] = []

class PendingItem(BaseModel):
    id: str  # source_type:id
    type: str  # "material_request", "material_usage", "labor_cost"
    project_id: int
    project_name: str
    description: str
    amount: float
    date: date

class ProcessItemRequest(BaseModel):
    item_id: str  # source_type:id
    action: str = "approve"  # approve, reject
    payment_status: str = "paid"
    override_amount: float | None = None
    override_quantity: float | None = None
    override_unit_price: float | None = None
    override_reason: str | None = None


class ProjectLite(BaseModel):
    id: int
    name: str
    budget: float
    total_spent: float


class ProjectFinancialDrilldown(BaseModel):
    summary: ProjectFinanceSummary
    transactions: list[TransactionResponse]
    labor_costs: list[LaborCostResponse]
    material_purchases: list[MaterialPurchaseResponse]
    pending_items: list[PendingItem]


class ReconciliationSummary(BaseModel):
    total_operational_records: int
    total_processed_records: int
    total_pending_records: int
    total_processed_amount: float
    total_pending_amount: float
