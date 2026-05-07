from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, ProjectMaterialStock
from app.models.master_data import MaterialCatalog
from app.models.operations import Attendance, DailyLog, MaterialUsage, MaterialRequest, MaterialRequestStatus
from app.schemas.se import BulkAttendanceCreate, DailyLogCreate, BulkMaterialUsageCreate, MaterialRequestCreate
from app.api.deps import require_se

router = APIRouter(prefix="/projects", tags=["Site Operations"])

def _verify_project_access(db: Session, project_id: int, user: User):
    """Verify project exists and user has access (Admin, PM, or assigned SE)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # SE can only access their assigned active project
    if user.role == UserRole.site_engineer:
        if project.site_engineer_id != user.id:
             raise HTTPException(status_code=403, detail="You are not assigned to this project")
    
    return project

@router.post("/{project_id}/attendance", status_code=201)
def mark_attendance(
    project_id: int,
    payload: BulkAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    project = _verify_project_access(db, project_id, current_user)
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot perform operations on a completed project")

    target_date = payload.date or date.today()

    # Check if attendance already marked for this date
    existing = db.query(Attendance).filter(
        Attendance.project_id == project.id,
        Attendance.date == target_date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this date")

    for record in payload.entries:
        att = Attendance(
            project_id=project.id,
            worker_id=record.worker_id,
            date=target_date,
            status=record.status,
            marked_by=current_user.id
        )
        db.add(att)
    
    db.commit()
    return {"message": f"Attendance marked for {len(payload.entries)} workers"}

@router.get("/{project_id}/attendance")
def get_attendance(
    project_id: int,
    date: date = date.today(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    _verify_project_access(db, project_id, current_user)
    records = db.query(Attendance).filter(
        Attendance.project_id == project_id,
        Attendance.date == date
    ).all()
    return records

@router.post("/{project_id}/daily-logs", status_code=201)
def create_daily_log(
    project_id: int,
    payload: DailyLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    project = _verify_project_access(db, project_id, current_user)
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot perform operations on a completed project")
    
    target_date = payload.date or date.today()

    # One log per day
    existing = db.query(DailyLog).filter(
        DailyLog.project_id == project.id,
        DailyLog.date == target_date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Daily log already exists for this date")

    log = DailyLog(
        project_id=project.id,
        date=target_date,
        summary=payload.summary,
        issues=payload.issues,
        notes=payload.notes,
        phase_id=payload.phase_id,
        created_by=current_user.id
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/{project_id}/daily-logs")
def list_daily_logs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    _verify_project_access(db, project_id, current_user)
    return db.query(DailyLog).filter(DailyLog.project_id == project_id).order_by(DailyLog.date.desc()).all()

@router.post("/{project_id}/material-usage", status_code=201)
def record_material_usage(
    project_id: int,
    payload: BulkMaterialUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    project = _verify_project_access(db, project_id, current_user)
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot perform operations on a completed project")
    
    target_date = payload.date or date.today()
    
    for entry in payload.entries:
        if entry.quantity_used <= 0:
            continue

        stock = db.query(ProjectMaterialStock).filter(
            ProjectMaterialStock.project_id == project.id,
            ProjectMaterialStock.material_id == entry.material_id
        ).first()
        
        if not stock:
             continue

        
        usage = MaterialUsage(
            project_id=project.id,
            material_id=entry.material_id,
            quantity_used=entry.quantity_used,
            date=target_date,
            phase_id=payload.phase_id,
            recorded_by=current_user.id
        )
        db.add(usage)
        
        # Update stock
        stock.quantity_available -= entry.quantity_used
        stock.quantity_used += entry.quantity_used
    
    db.commit()
    return {"message": "Material usage recorded"}

@router.get("/{project_id}/material-usage")
def list_material_usage(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    _verify_project_access(db, project_id, current_user)
    usages = db.query(MaterialUsage).filter(MaterialUsage.project_id == project_id).order_by(MaterialUsage.date.desc()).all()
    
    # Enrich with material details
    result = []
    for u in usages:
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == u.material_id).first()
        result.append({
            "id": u.id,
            "date": u.date,
            "material_id": u.material_id,
            "material_name": m.name if m else "Unknown",
            "unit": m.unit if m else "",
            "quantity_used": u.quantity_used
        })
    return result

@router.post("/{project_id}/material-requests", status_code=201)
def create_material_request(
    project_id: int,
    payload: MaterialRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    project = _verify_project_access(db, project_id, current_user)
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot perform operations on a completed project")
    
    req = MaterialRequest(
        project_id=project.id,
        material_id=payload.material_id,
        quantity=payload.quantity,
        message=payload.message,
        requested_by=current_user.id,
        status=MaterialRequestStatus.pending
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

@router.get("/{project_id}/material-requests")
def list_material_requests(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_se)
):
    _verify_project_access(db, project_id, current_user)
    requests = db.query(MaterialRequest).filter(MaterialRequest.project_id == project_id).order_by(MaterialRequest.created_at.desc()).all()
    
    result = []
    for r in requests:
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == r.material_id).first()
        result.append({
            "id": r.id,
            "created_at": r.created_at,
            "material_id": r.material_id,
            "material_name": m.name if m else "Unknown",
            "unit": m.unit if m else "",
            "quantity": r.quantity,
            "status": r.status,
            "message": r.message
        })
    return result
