"""Pydantic schemas for daily operations: Attendance, DailyLog, MaterialUsage, MaterialRequest."""

from datetime import date, datetime

from pydantic import BaseModel


# --- Attendance ---

class AttendanceEntry(BaseModel):
    worker_id: int
    status: str  # present, absent, half_day


class BulkAttendanceRequest(BaseModel):
    date: date
    entries: list[AttendanceEntry]


class AttendanceResponse(BaseModel):
    id: int
    project_id: int
    worker_id: int
    date: date
    status: str
    marked_by: int
    created_at: datetime
    worker_name: str | None = None
    worker_role_name: str | None = None

    model_config = {"from_attributes": True}


# --- Daily Log ---

class DailyLogCreate(BaseModel):
    date: date
    summary: str
    issues: str | None = None
    notes: str | None = None


class DailyLogUpdate(BaseModel):
    summary: str | None = None
    issues: str | None = None
    notes: str | None = None


class DailyLogResponse(BaseModel):
    id: int
    project_id: int
    date: date
    summary: str
    issues: str | None
    notes: str | None
    created_by: int
    created_at: datetime
    creator_name: str | None = None

    model_config = {"from_attributes": True}


# --- Material Usage ---

class MaterialUsageCreate(BaseModel):
    material_id: int
    quantity_used: float
    date: date


class MaterialUsageResponse(BaseModel):
    id: int
    project_id: int
    material_id: int
    quantity_used: float
    date: date
    recorded_by: int
    created_at: datetime
    material_name: str | None = None
    material_unit: str | None = None

    model_config = {"from_attributes": True}


# --- Material Request ---

class MaterialRequestCreate(BaseModel):
    material_id: int
    quantity: float
    message: str | None = None


class MaterialRequestAction(BaseModel):
    status: str  # approved, rejected


class MaterialRequestResponse(BaseModel):
    id: int
    project_id: int
    material_id: int
    quantity: float
    message: str | None
    status: str
    requested_by: int
    approved_by: int | None
    created_at: datetime
    updated_at: datetime
    material_name: str | None = None
    material_unit: str | None = None
    material_unit_price: float | None = 0.0
    project_name: str | None = None
    requester_name: str | None = None
    approver_name: str | None = None

    model_config = {"from_attributes": True}
