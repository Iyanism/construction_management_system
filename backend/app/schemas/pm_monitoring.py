from datetime import date
from pydantic import BaseModel
from typing import List

class ProjectPerformanceMetric(BaseModel):
    id: int
    name: str
    status: str
    progress_percentage: float
    budget: float
    total_spent: float
    worker_count: int
    over_budget: bool
    delayed: bool
    start_date: date
    end_date: date

class PMMonitoringSummary(BaseModel):
    projects: List[ProjectPerformanceMetric]
