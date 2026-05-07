from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus, ProjectWorkerAssignment, ProjectPhase, PhaseStatus
from app.models.operations import MaterialRequest, MaterialRequestStatus
from app.models.finance import FinancialTransaction
from app.schemas.operations import MaterialRequestResponse, MaterialRequestAction
from app.schemas.pm_monitoring import PMMonitoringSummary, ProjectPerformanceMetric
from app.api.deps import require_pm

router = APIRouter(prefix="/pm", tags=["Project Manager"])

@router.get("/material-requests", response_model=List[MaterialRequestResponse])
def list_pm_material_requests(
    status: str | None = Query("pending"),
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm),
):
    """List all material requests for projects managed by the current PM."""
    if project_id:
        p = db.query(Project).filter(Project.id == project_id).first()
        if not p or p.project_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this project")
        project_ids = [project_id]
    else:
        projects = db.query(Project).filter(Project.project_manager_id == current_user.id).all()
        project_ids = [p.id for p in projects]
    
    if not project_ids:
        return []
        
    query = db.query(MaterialRequest).filter(MaterialRequest.project_id.in_(project_ids))
    
    if status:
        query = query.filter(MaterialRequest.status == status)
        
    requests = query.order_by(MaterialRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        # Minimal enrichment
        p = db.query(Project).filter(Project.id == req.project_id).first()
        result.append(MaterialRequestResponse(
            **{c.name: getattr(req, c.name) for c in req.__table__.columns},
            project_name=p.name if p else None,
            material_name=req.material.name if req.material else None,
            material_unit=req.material.unit if req.material else None,
            material_unit_price=req.material.unit_price if req.material else 0.0,
            requester_name=req.requester.full_name if req.requester else None,
            approver_name=req.approver.full_name if req.approver else None
        ))
    return result

@router.post("/material-requests/{request_id}/action", response_model=MaterialRequestResponse)
def handle_material_request(
    request_id: int,
    payload: MaterialRequestAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm),
):
    """Approve or reject a material request."""
    req = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    p = db.query(Project).filter(Project.id == req.project_id).first()
    if p.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this project")
        
    if req.status != MaterialRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already processed")
        
    req.status = MaterialRequestStatus(payload.status)
    req.approved_by = current_user.id
    db.commit()
    db.refresh(req)
    
    return MaterialRequestResponse(
        **{c.name: getattr(req, c.name) for c in req.__table__.columns},
        project_name=p.name if p else None,
        material_name=req.material.name if req.material else None,
        material_unit=req.material.unit if req.material else None,
        material_unit_price=req.material.unit_price if req.material else 0.0,
        requester_name=req.requester.full_name if req.requester else None,
        approver_name=req.approver.full_name if req.approver else None
    )

@router.get("/monitoring-summary", response_model=PMMonitoringSummary)
def get_pm_monitoring_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm),
):
    """Performance metrics for all projects managed by the current PM."""
    projects = db.query(Project).filter(Project.project_manager_id == current_user.id).all()
    today = date.today()
    
    metrics = []
    for p in projects:
        spent = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
            FinancialTransaction.project_id == p.id
        ).scalar()
        
        worker_count = db.query(ProjectWorkerAssignment).filter(
            ProjectWorkerAssignment.project_id == p.id,
            ProjectWorkerAssignment.released_at.is_(None)
        ).count()
        
        total_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == p.id).count()
        completed_phases = db.query(ProjectPhase).filter(
            ProjectPhase.project_id == p.id, ProjectPhase.status == PhaseStatus.completed
        ).count()
        progress = (completed_phases / total_phases * 100) if total_phases > 0 else 0
        
        metrics.append(ProjectPerformanceMetric(
            id=p.id,
            name=p.name,
            status=p.status,
            progress_percentage=round(progress, 1),
            budget=p.budget,
            total_spent=float(spent),
            worker_count=worker_count,
            over_budget=spent > p.budget and p.budget > 0,
            delayed=p.status == ProjectStatus.active and p.end_date and p.end_date < today,
            start_date=p.start_date,
            end_date=p.end_date
        ))
        
    return PMMonitoringSummary(projects=metrics)
