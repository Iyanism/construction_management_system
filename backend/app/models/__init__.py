"""SQLAlchemy models package. Import all models here so Base.metadata sees them."""

from app.models.user import User
from app.models.master_data import WorkerRole, WageRate, MaterialCatalog, Worker
from app.models.project import (
    Project,
    ProjectWorkerAssignment,
    ProjectMaterialEstimate,
    ProjectMaterialStock,
    ProjectPhase,
    ProjectDocument,
)
from app.models.operations import Attendance, DailyLog, MaterialUsage, MaterialRequest
from app.models.finance import MaterialPurchase, LaborCostEntry, FinancialTransaction
from app.models.audit import AuditLog

__all__ = [
    "User",
    "WorkerRole",
    "WageRate",
    "MaterialCatalog",
    "Worker",
    "Project",
    "ProjectWorkerAssignment",
    "ProjectMaterialEstimate",
    "ProjectMaterialStock",
    "ProjectPhase",
    "ProjectDocument",
    "Attendance",
    "DailyLog",
    "MaterialUsage",
    "MaterialRequest",
    "MaterialPurchase",
    "LaborCostEntry",
    "FinancialTransaction",
    "AuditLog",
]
