import datetime
from pydantic import BaseModel
from app.models.operations import AttendanceStatus

class AttendanceRecord(BaseModel):
    worker_id: int
    status: AttendanceStatus

class BulkAttendanceCreate(BaseModel):
    date: datetime.date | None = None
    entries: list[AttendanceRecord]

class DailyLogCreate(BaseModel):
    date: datetime.date | None = None
    summary: str
    issues: str | None = None
    notes: str | None = None
    phase_id: int | None = None

class MaterialUsageCreate(BaseModel):
    material_id: int
    quantity_used: float

class BulkMaterialUsageCreate(BaseModel):
    date: datetime.date | None = None
    entries: list[MaterialUsageCreate]
    phase_id: int | None = None

class MaterialRequestCreate(BaseModel):
    material_id: int
    quantity: float
    message: str | None = None
