from pydantic import BaseModel
from datetime import date

class MaterialConsumptionReport(BaseModel):
    project_id: int
    project_name: str
    material_name: str
    total_quantity_used: float
    unit: str

class AttendanceTrendReport(BaseModel):
    date: date
    present_count: int
    half_day_count: int
    absent_count: int

class FinancialStatusReport(BaseModel):
    project_name: str
    budget: float
    spent: float
    remaining: float
    utilization: float

class SpendingTrendReport(BaseModel):
    month: str
    amount: float

class ProjectPerformanceReport(BaseModel):
    project_name: str
    status: str
    completion_percentage: float
    days_elapsed: int
    days_remaining: int
