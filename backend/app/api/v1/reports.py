from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.master_data import MaterialCatalog
from app.models.operations import Attendance, AttendanceStatus, MaterialUsage
from app.models.finance import FinancialTransaction
from app.schemas.reports import (
    MaterialConsumptionReport, AttendanceTrendReport, FinancialStatusReport,
    SpendingTrendReport, ProjectPerformanceReport
)
from app.api.deps import require_admin_or_pm, require_admin

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/material-consumption", response_model=list[MaterialConsumptionReport])
def get_material_consumption_report(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_pm),
):
    """Report on material consumption across projects."""
    query = db.query(
        MaterialUsage.project_id,
        Project.name.label("project_name"),
        MaterialCatalog.name.label("material_name"),
        func.sum(MaterialUsage.quantity_used).label("total_quantity_used"),
        MaterialCatalog.unit
    ).join(Project, MaterialUsage.project_id == Project.id)\
     .join(MaterialCatalog, MaterialUsage.material_id == MaterialCatalog.id)
    
    if project_id:
        query = query.filter(MaterialUsage.project_id == project_id)
    
    results = query.group_by(MaterialUsage.project_id, MaterialCatalog.id).all()
    
    return [
        MaterialConsumptionReport(
            project_id=r.project_id,
            project_name=r.project_name,
            material_name=r.material_name,
            total_quantity_used=r.total_quantity_used,
            unit=r.unit
        ) for r in results
    ]

@router.get("/attendance-trends", response_model=list[AttendanceTrendReport])
def get_attendance_trends(
    days: int = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Daily attendance trends for the last N days."""
    start_date = date.today() - timedelta(days=days)
    
    results = db.query(
        Attendance.date,
        func.count(Attendance.id).filter(Attendance.status == AttendanceStatus.present).label("present"),
        func.count(Attendance.id).filter(Attendance.status == AttendanceStatus.half_day).label("half_day"),
        func.count(Attendance.id).filter(Attendance.status == AttendanceStatus.absent).label("absent")
    ).filter(Attendance.date >= start_date)\
     .group_by(Attendance.date)\
     .order_by(Attendance.date.asc()).all()
    
    return [
        AttendanceTrendReport(
            date=r.date,
            present_count=r.present,
            half_day_count=r.half_day,
            absent_count=r.absent
        ) for r in results
    ]

@router.get("/financial-status", response_model=list[FinancialStatusReport])
def get_financial_status_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Project-wise budget status report."""
    projects = db.query(Project).all()
    
    report = []
    for p in projects:
        spent = db.query(func.sum(FinancialTransaction.amount)).filter(FinancialTransaction.project_id == p.id).scalar() or 0.0
        report.append(FinancialStatusReport(
            project_name=p.name,
            budget=p.budget,
            spent=spent,
            remaining=p.budget - spent,
            utilization=(spent / p.budget * 100) if p.budget > 0 else 0.0
        ))
    
    return report

@router.get("/spending-trends", response_model=list[SpendingTrendReport])
def get_spending_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Monthly spending trends for the last 6 months."""
    # Simple implementation: group by month
    results = db.query(
        func.strftime('%Y-%m', FinancialTransaction.date).label("month"),
        func.sum(FinancialTransaction.amount).label("total")
    ).group_by("month").order_by("month").limit(6).all()
    
    return [SpendingTrendReport(month=r.month, amount=r.total) for r in results]

@router.get("/project-performance", response_model=list[ProjectPerformanceReport])
def get_project_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Performance metrics for all projects."""
    projects = db.query(Project).all()
    today = date.today()
    
    report = []
    for p in projects:
        # Simple completion % logic (can be more complex later)
        # For now, let's just say if it's completed it's 100%, otherwise 50% for active
        completion = 100.0 if p.status == "completed" else (50.0 if p.status == "active" else 0.0)
        
        days_elapsed = (today - p.start_date).days if p.start_date else 0
        days_remaining = (p.end_date - today).days if p.end_date else 0
        
        report.append(ProjectPerformanceReport(
            project_name=p.name,
            status=p.status,
            completion_percentage=completion,
            days_elapsed=max(0, days_elapsed),
            days_remaining=max(0, days_remaining)
        ))
    
    return report
