"""Pydantic schemas for Project and related entities."""

from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.master_data import MaterialCatalogResponse, WorkerResponse


# --- Project ---

class ProjectCreate(BaseModel):
    name: str
    client_name: str
    location: str
    description: str | None = None
    start_date: date
    end_date: date
    budget: float


class ProjectUpdate(BaseModel):
    name: str | None = None
    client_name: str | None = None
    location: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None


class ProjectStatusUpdate(BaseModel):
    status: str  # draft, planning, active, completed


class ProjectResponse(BaseModel):
    id: int
    name: str
    client_name: str
    location: str
    description: str | None
    start_date: date
    end_date: date
    budget: float
    status: str
    project_manager_id: int
    site_engineer_id: int | None
    created_by: int
    updated_by: int | None
    created_at: datetime
    updated_at: datetime
    project_manager_name: str | None = None
    site_engineer_name: str | None = None
    progress_percentage: float | None = None
    budget_warning: bool = False
    total_spent: float | None = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    id: int
    name: str
    client_name: str
    location: str
    status: str
    start_date: date
    end_date: date
    budget: float
    project_manager_name: str | None = None
    site_engineer_name: str | None = None
    progress_percentage: float | None = None

    model_config = {"from_attributes": True}


# --- Assign Engineer ---

class AssignEngineerRequest(BaseModel):
    site_engineer_id: int


# --- Bulk Worker Assignment ---

class WorkerRoleCount(BaseModel):
    worker_role_id: int
    count: int


class BulkAssignWorkersRequest(BaseModel):
    assignments: list[WorkerRoleCount]


class ProjectWorkerResponse(BaseModel):
    id: int
    project_id: int
    worker_id: int
    assigned_at: datetime
    released_at: datetime | None
    worker: WorkerResponse | None = None

    model_config = {"from_attributes": True}


# --- Material Estimate ---

class MaterialEstimateCreate(BaseModel):
    material_id: int
    estimated_quantity: float


class MaterialEstimateUpdate(BaseModel):
    estimated_quantity: float


class MaterialEstimateResponse(BaseModel):
    id: int
    project_id: int
    material_id: int
    estimated_quantity: float
    material: MaterialCatalogResponse | None = None

    model_config = {"from_attributes": True}


# --- Material Stock ---

class MaterialStockResponse(BaseModel):
    id: int
    project_id: int
    material_id: int
    quantity_available: float
    quantity_used: float
    last_updated: datetime
    material: MaterialCatalogResponse | None = None

    model_config = {"from_attributes": True}


# --- Phase ---

class PhaseCreate(BaseModel):
    name: str
    description: str | None = None
    order: int


class PhaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    order: int | None = None
    status: str | None = None

class PhaseProgressUpdate(BaseModel):
    status: str
    progress_percentage: float


class PhaseResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: str | None
    order: int
    status: str
    progress_percentage: float

    model_config = {"from_attributes": True}


# --- Document ---

class DocumentResponse(BaseModel):
    id: int
    project_id: int
    filename: str
    original_filename: str
    file_size: int
    uploaded_by: int
    uploaded_at: datetime
    uploader_name: str | None = None

    model_config = {"from_attributes": True}


# --- Project Summary ---

class ProjectSummary(BaseModel):
    project: ProjectResponse
    total_workers: int
    total_phases: int
    completed_phases: int
    total_material_estimates: int
    total_material_stock_items: int
    total_attendance_records: int
    total_daily_logs: int
    total_material_requests: int
    total_financial_transactions: int
    total_spent: float
    budget_remaining: float
    budget_utilization_percentage: float
