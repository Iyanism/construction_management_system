"""Dashboard routes for role-specific overviews."""

from datetime import date, timezone, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus, ProjectWorkerAssignment, ProjectMaterialStock, ProjectPhase, PhaseStatus
from app.models.master_data import Worker, MaterialCatalog
from app.models.operations import MaterialRequest, MaterialRequestStatus, Attendance, DailyLog, MaterialUsage
from app.models.finance import FinancialTransaction, PaymentStatus
from app.schemas.dashboard import AdminDashboard, PMDashboard, SEDashboard, AccountantDashboard
from app.api.deps import require_admin, require_pm, require_se, require_accountant

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin", response_model=AdminDashboard)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    total_users = db.query(User).count()
    total_workers = db.query(Worker).count()
    projects = db.query(Project).all()
    
    total_budget = sum(p.budget for p in projects)
    total_spent = db.query(func.sum(FinancialTransaction.amount)).scalar() or 0.0

    active_projects = sum(1 for p in projects if p.status == ProjectStatus.active)
    completed_projects = sum(1 for p in projects if p.status == ProjectStatus.completed)
    
    # Delayed logic (simple: end_date is in the past and not completed)
    today = date.today()
    projects_delayed = sum(1 for p in projects if p.end_date and p.end_date < today and p.status != ProjectStatus.completed)
    
    # Over budget
    over_budget_count = 0
    for p in projects:
        spent = db.query(func.sum(FinancialTransaction.amount)).filter(FinancialTransaction.project_id == p.id).scalar() or 0.0
        if p.budget > 0 and spent > p.budget:
            over_budget_count += 1
            
    # Idle workers
    workers_unassigned = db.query(Worker).filter(Worker.status == "available").count()
    
    # Pending requests
    pending_material_requests = db.query(MaterialRequest).filter(MaterialRequest.status == MaterialRequestStatus.pending).count()
    
    # Recent activity
    latest_project = db.query(Project).order_by(Project.created_at.desc()).first()
    recent_request = db.query(MaterialRequest).order_by(MaterialRequest.created_at.desc()).first()
    recent_tx = db.query(FinancialTransaction).order_by(FinancialTransaction.created_at.desc()).first()
    latest_user = db.query(User).order_by(User.created_at.desc()).first()

    recent_activity = {
        "latest_project": {"id": latest_project.id, "name": latest_project.name} if latest_project else None,
        "recent_request": {"id": recent_request.id, "material": recent_request.material_id} if recent_request else None,
        "recent_tx": {"id": recent_tx.id, "amount": recent_tx.amount} if recent_tx else None,
        "latest_user": {"id": latest_user.id, "name": latest_user.full_name} if latest_user else None,
    }

    return AdminDashboard(
        total_users=total_users,
        active_projects=active_projects,
        total_projects=len(projects),
        total_workers=total_workers,
        total_budget=total_budget,
        total_spent=float(total_spent),
        projects_over_budget=over_budget_count,
        projects_delayed=projects_delayed,
        pending_material_requests=pending_material_requests,
        workers_unassigned=workers_unassigned,
        completed_projects=completed_projects,
        recent_activity=recent_activity,
    )


@router.get("/project-manager", response_model=PMDashboard)
def get_pm_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm),
):
    projects = db.query(Project).filter(Project.project_manager_id == current_user.id).all()
    project_ids = [p.id for p in projects]
    
    pending_reqs = db.query(MaterialRequest).filter(
        MaterialRequest.project_id.in_(project_ids),
        MaterialRequest.status == MaterialRequestStatus.pending,
    ).count() if project_ids else 0

    proj_list = []
    over_budget_count = 0
    delayed_count = 0
    critical_count = 0
    at_risk_count = 0
    total_progress = 0
    today = date.today()

    for p in projects:
        spent = db.query(func.sum(FinancialTransaction.amount)).filter(FinancialTransaction.project_id == p.id).scalar() or 0.0
        is_over_budget = spent > p.budget and p.budget > 0
        if is_over_budget:
            over_budget_count += 1
        
        # Calculate Expected Progress
        total_days = (p.end_date - p.start_date).days if p.end_date and p.start_date else 1
        elapsed_days = (today - p.start_date).days if p.start_date else 0
        expected_progress = min(100, max(0, (elapsed_days / total_days) * 100)) if total_days > 0 else 0
        
        # Actual Progress (based on average of phases)
        actual_progress = db.query(func.avg(ProjectPhase.progress_percentage)).filter(ProjectPhase.project_id == p.id).scalar() or 0.0
        if p.status == ProjectStatus.completed:
            actual_progress = 100.0
        
        delay_diff = expected_progress - actual_progress
        is_delayed = p.status == ProjectStatus.active and delay_diff > 5 # More than 5% behind
        
        if is_delayed:
            delayed_count += 1
            
        # Determine Health
        health = "ON TRACK"
        priority = 3
        if is_delayed and is_over_budget:
            health = "CRITICAL"
            priority = 1
            critical_count += 1
        elif is_delayed or is_over_budget or (p.budget > 0 and spent > p.budget * 0.9):
            health = "AT RISK"
            priority = 2
            at_risk_count += 1
            
        total_progress += (actual_progress / 100.0)

        proj_list.append({
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "budget": p.budget,
            "total_spent": float(spent),
            "budget_utilization": (spent / p.budget * 100) if p.budget > 0 else 0,
            "progress": actual_progress,
            "expected_progress": expected_progress,
            "delay_diff": delay_diff,
            "health": health,
            "priority": priority
        })

    # Sort projects by health priority
    proj_list.sort(key=lambda x: x["priority"])

    avg_progress = (total_progress / len(projects) * 100) if projects else 0.0

    # Recent pending requests list
    pending_list = []
    if project_ids:
        db_reqs = db.query(MaterialRequest)\
            .filter(MaterialRequest.project_id.in_(project_ids), MaterialRequest.status == MaterialRequestStatus.pending)\
            .order_by(MaterialRequest.created_at.desc())\
            .limit(5).all()
        
        for req in db_reqs:
            p = next((proj for proj in projects if proj.id == req.project_id), None)
            m = db.query(MaterialCatalog).filter(MaterialCatalog.id == req.material_id).first()
            pending_list.append({
                "id": req.id,
                "project_id": req.project_id,
                "project_name": p.name if p else "Unknown",
                "material_name": m.name if m else "Unknown",
                "quantity": req.quantity,
                "unit": m.unit if m else "",
                "unit_price": m.unit_price if m else 0.0,
                "created_at": req.created_at,
            })

    return PMDashboard(
        my_projects=len(projects),
        active_projects=sum(1 for p in projects if p.status == ProjectStatus.active),
        draft_projects=sum(1 for p in projects if p.status == ProjectStatus.draft),
        planning_projects=sum(1 for p in projects if p.status == ProjectStatus.planning),
        completed_projects=sum(1 for p in projects if p.status == ProjectStatus.completed),
        pending_material_requests=pending_reqs,
        projects_over_budget=over_budget_count,
        delayed_projects=delayed_count,
        critical_projects=critical_count,
        at_risk_projects=at_risk_count,
        overall_progress=avg_progress,
        projects=proj_list,
        pending_requests_list=pending_list,
    )


@router.get("/site-engineer", response_model=SEDashboard)
def get_se_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se),
):
    # Find the active assigned project
    project = db.query(Project).filter(
        Project.site_engineer_id == current_user.id,
        Project.status == ProjectStatus.active
    ).first()
    
    if not project:
        return SEDashboard(
            assigned_project_id=None,
            assigned_project_name=None,
            assigned_project_status=None,
            total_assigned_workers=0,
            todays_attendance_marked=False,
            todays_log_exists=False,
            todays_material_usage_exists=False,
            pending_material_requests=0,
            low_stock_count=0,
            recent_logs=[],
        )

    assigned_workers = db.query(ProjectWorkerAssignment).filter(
        ProjectWorkerAssignment.project_id == project.id,
        ProjectWorkerAssignment.released_at.is_(None)
    ).count()

    today = datetime.now(timezone.utc).date()
    
    att_count = db.query(Attendance).filter(
        Attendance.project_id == project.id,
        Attendance.date == today
    ).count()
    
    log_exists = db.query(DailyLog).filter(
        DailyLog.project_id == project.id,
        DailyLog.date == today
    ).count() > 0

    usage_exists = db.query(MaterialUsage).filter(
        MaterialUsage.project_id == project.id,
        MaterialUsage.date == today
    ).count() > 0
    
    pending_reqs = db.query(MaterialRequest).filter(
        MaterialRequest.project_id == project.id,
        MaterialRequest.status == MaterialRequestStatus.pending
    ).count()

    # Get active phase
    active_phase = db.query(ProjectPhase).filter(
        ProjectPhase.project_id == project.id,
        ProjectPhase.status == PhaseStatus.in_progress
    ).order_by(ProjectPhase.order).first()

    # Low stock details
    low_stock_query = db.query(ProjectMaterialStock).filter(
        ProjectMaterialStock.project_id == project.id,
        ProjectMaterialStock.quantity_available < 10
    )
    low_stock_count = low_stock_query.count()
    low_stock_items = low_stock_query.limit(3).all()
    
    low_stock_list = []
    for item in low_stock_items:
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == item.material_id).first()
        low_stock_list.append({
            "material_name": m.name if m else "Unknown",
            "quantity_available": item.quantity_available,
            "unit": m.unit if m else "",
            "is_critical": item.quantity_available < 5
        })

    recent_logs = db.query(DailyLog).filter(DailyLog.project_id == project.id).order_by(DailyLog.date.desc()).limit(5).all()

    return SEDashboard(
        assigned_project_id=project.id,
        assigned_project_name=project.name,
        assigned_project_status=project.status.value,
        active_phase_id=active_phase.id if active_phase else None,
        active_phase_name=active_phase.name if active_phase else None,
        total_assigned_workers=assigned_workers,
        todays_attendance_marked=att_count > 0,
        todays_log_exists=log_exists,
        todays_material_usage_exists=usage_exists,
        pending_material_requests=pending_reqs,
        low_stock_count=low_stock_count,
        low_stock_materials=low_stock_list,
        recent_logs=[{"id": log.id, "date": log.date, "summary": log.summary} for log in recent_logs],
    )


@router.get("/accountant", response_model=AccountantDashboard)
def get_accountant_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    projects = db.query(Project).all()
    active_count = sum(1 for p in projects if p.status == ProjectStatus.active)
    total_budget = sum(p.budget for p in projects)
    
    total_spent = db.query(func.sum(FinancialTransaction.amount)).scalar() or 0.0
    pending_payments = db.query(FinancialTransaction).filter(
        FinancialTransaction.payment_status == PaymentStatus.pending
    ).count()
    
    recent_txs = db.query(FinancialTransaction).order_by(FinancialTransaction.date.desc(), FinancialTransaction.id.desc()).limit(5).all()
    tx_list = []
    for tx in recent_txs:
        p = next((proj for proj in projects if proj.id == tx.project_id), None)
        tx_list.append({
            "id": tx.id,
            "project_name": p.name if p else "Unknown",
            "category": tx.category.value,
            "amount": float(tx.amount),
            "date": tx.date,
            "status": tx.payment_status.value,
        })
        
    over_budget_count = 0
    for p in projects:
        spent = db.query(func.sum(FinancialTransaction.amount)).filter(FinancialTransaction.project_id == p.id).scalar() or 0.0
        if spent > p.budget:
            over_budget_count += 1

    return AccountantDashboard(
        total_active_projects=active_count,
        total_budget=total_budget,
        total_spent=total_spent,
        total_remaining=total_budget - total_spent,
        pending_payments=pending_payments,
        recent_transactions=tx_list,
        projects_over_budget=over_budget_count,
    )
