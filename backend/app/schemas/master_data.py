"""Pydantic schemas for master data: WorkerRole, WageRate, MaterialCatalog, Worker."""

from datetime import date, datetime

from pydantic import BaseModel


# --- Worker Role ---

class WorkerRoleCreate(BaseModel):
    name: str
    description: str | None = None


class WorkerRoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class WorkerRoleResponse(BaseModel):
    id: int
    name: str
    description: str | None
    base_rate: float | None = 0.0

    model_config = {"from_attributes": True}


# --- Wage Rate ---

class WageRateCreate(BaseModel):
    worker_role_id: int
    daily_rate: float
    effective_from: date


class WageRateUpdate(BaseModel):
    daily_rate: float | None = None
    effective_from: date | None = None


class WageRateResponse(BaseModel):
    id: int
    worker_role_id: int
    daily_rate: float
    effective_from: date
    worker_role: WorkerRoleResponse | None = None

    model_config = {"from_attributes": True}


# --- Material Catalog ---

class MaterialCatalogCreate(BaseModel):
    name: str
    unit: str
    unit_price: float
    category: str


class MaterialCatalogUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    unit_price: float | None = None
    category: str | None = None


class MaterialCatalogResponse(BaseModel):
    id: int
    name: str
    unit: str
    unit_price: float
    category: str

    model_config = {"from_attributes": True}


# --- Worker ---

class WorkerCreate(BaseModel):
    name: str
    phone: str | None = None
    worker_role_id: int


class WorkerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    worker_role_id: int | None = None
    is_active: bool | None = None


class WorkerResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    worker_role_id: int
    status: str
    is_active: bool
    created_at: datetime
    worker_role: WorkerRoleResponse | None = None

    model_config = {"from_attributes": True}
