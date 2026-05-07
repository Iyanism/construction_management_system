"""Operations routes: Attendance, DailyLog, MaterialUsage, MaterialRequest."""


from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.project import (
    Project, ProjectStatus, ProjectWorkerAssignment, ProjectMaterialStock,
)
from app.models.master_data import Worker, MaterialCatalog
from app.models.operations import (
    Attendance, AttendanceStatus, DailyLog, MaterialUsage,
    MaterialRequest, MaterialRequestStatus,
)
from app.schemas.operations import (
    BulkAttendanceRequest, AttendanceResponse, DailyLogCreate, DailyLogUpdate,
    DailyLogResponse, MaterialUsageCreate, MaterialUsageResponse,
    MaterialRequestCreate, MaterialRequestAction, MaterialRequestResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}", tags=["Operations"])


def _get_active_project(db: Session, project_id: int, user: User) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != ProjectStatus.active:
        raise HTTPException(status_code=400, detail="Project is not active")
    # Access check
    if user.role == UserRole.site_engineer and project.site_engineer_id != user.id:
        raise HTTPException(status_code=403, detail="Not assigned to this project")
    if user.role == UserRole.project_manager and project.project_manager_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


def _get_readable_project(db: Session, project_id: int, user: User) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == UserRole.site_engineer and project.site_engineer_id != user.id:
        raise HTTPException(status_code=403, detail="Not assigned to this project")
    if user.role == UserRole.project_manager and project.project_manager_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


# ==================== Attendance ====================

@router.post("/attendance", response_model=list[AttendanceResponse], status_code=201)
def mark_attendance(
    project_id: int, payload: BulkAttendanceRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Only site engineers can mark attendance")

    _get_active_project(db, project_id, current_user)
    created = []

    for entry in payload.entries:
        # Validate worker is assigned
        assignment = db.query(ProjectWorkerAssignment).filter(
            ProjectWorkerAssignment.project_id == project_id,
            ProjectWorkerAssignment.worker_id == entry.worker_id,
            ProjectWorkerAssignment.released_at.is_(None),
        ).first()
        if not assignment:
            raise HTTPException(status_code=400, detail=f"Worker {entry.worker_id} not assigned to project")

        # Check duplicate
        existing = db.query(Attendance).filter(
            Attendance.project_id == project_id,
            Attendance.worker_id == entry.worker_id,
            Attendance.date == payload.date,
        ).first()
        if existing:
            # Update existing
            try:
                existing.status = AttendanceStatus(entry.status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {entry.status}")
            created.append(existing)
            continue

        try:
            att_status = AttendanceStatus(entry.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {entry.status}")

        attendance = Attendance(
            project_id=project_id, worker_id=entry.worker_id,
            date=payload.date, status=att_status, marked_by=current_user.id,
        )
        db.add(attendance)
        created.append(attendance)

    db.commit()
    result = []
    for att in created:
        db.refresh(att)
        worker = db.query(Worker).filter(Worker.id == att.worker_id).first()
        result.append(AttendanceResponse(
            **{c.name: getattr(att, c.name) for c in att.__table__.columns},
            worker_name=worker.name if worker else None,
            worker_role_name=worker.worker_role.name if worker and worker.worker_role else None,
        ))
    return result


@router.get("/attendance", response_model=list[AttendanceResponse])
def get_attendance(
    project_id: int, date: str | None = Query(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_readable_project(db, project_id, current_user)
    query = db.query(Attendance).filter(Attendance.project_id == project_id)
    if date:
        query = query.filter(Attendance.date == date)
    records = query.order_by(Attendance.date.desc()).all()

    result = []
    for att in records:
        worker = db.query(Worker).filter(Worker.id == att.worker_id).first()
        result.append(AttendanceResponse(
            **{c.name: getattr(att, c.name) for c in att.__table__.columns},
            worker_name=worker.name if worker else None,
            worker_role_name=worker.worker_role.name if worker and worker.worker_role else None,
        ))
    return result


# ==================== Daily Logs ====================

@router.post("/daily-logs", response_model=DailyLogResponse, status_code=201)
def create_daily_log(
    project_id: int, payload: DailyLogCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Only site engineers can create daily logs")

    _get_active_project(db, project_id, current_user)

    existing = db.query(DailyLog).filter(
        DailyLog.project_id == project_id, DailyLog.date == payload.date
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Daily log already exists for this date")

    log = DailyLog(
        project_id=project_id, date=payload.date, summary=payload.summary,
        issues=payload.issues, notes=payload.notes, created_by=current_user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return DailyLogResponse(
        **{c.name: getattr(log, c.name) for c in log.__table__.columns},
        creator_name=current_user.full_name,
    )


@router.get("/daily-logs", response_model=list[DailyLogResponse])
def list_daily_logs(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_readable_project(db, project_id, current_user)
    if current_user.role == UserRole.accountant:
        raise HTTPException(status_code=403, detail="Accountants cannot view daily logs")

    logs = db.query(DailyLog).filter(DailyLog.project_id == project_id).order_by(DailyLog.date.desc()).all()
    result = []
    for log in logs:
        creator = db.query(User).filter(User.id == log.created_by).first()
        result.append(DailyLogResponse(
            **{c.name: getattr(log, c.name) for c in log.__table__.columns},
            creator_name=creator.full_name if creator else None,
        ))
    return result


@router.put("/daily-logs/{log_id}", response_model=DailyLogResponse)
def update_daily_log(
    project_id: int, log_id: int, payload: DailyLogUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Only site engineers can update daily logs")

    _get_active_project(db, project_id, current_user)
    log = db.query(DailyLog).filter(DailyLog.id == log_id, DailyLog.project_id == project_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found")

    if payload.summary is not None:
        log.summary = payload.summary
    if payload.issues is not None:
        log.issues = payload.issues
    if payload.notes is not None:
        log.notes = payload.notes

    db.commit()
    db.refresh(log)
    return DailyLogResponse(
        **{c.name: getattr(log, c.name) for c in log.__table__.columns},
        creator_name=current_user.full_name,
    )


# ==================== Material Usage ====================

@router.post("/material-usage", response_model=MaterialUsageResponse, status_code=201)
def record_material_usage(
    project_id: int, payload: MaterialUsageCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Only site engineers can record material usage")

    _get_active_project(db, project_id, current_user)

    # Validate stock
    stock = db.query(ProjectMaterialStock).filter(
        ProjectMaterialStock.project_id == project_id,
        ProjectMaterialStock.material_id == payload.material_id,
    ).first()

    if not stock:
        raise HTTPException(status_code=400, detail="No stock available for this material in this project")
    if payload.quantity_used > stock.quantity_available:
        raise HTTPException(
            status_code=400,
            detail=f"Usage ({payload.quantity_used}) exceeds available stock ({stock.quantity_available})",
        )

    # Record usage
    usage = MaterialUsage(
        project_id=project_id, material_id=payload.material_id,
        quantity_used=payload.quantity_used, date=payload.date,
        recorded_by=current_user.id,
    )
    db.add(usage)

    # Update stock
    stock.quantity_available -= payload.quantity_used
    stock.quantity_used += payload.quantity_used

    db.commit()
    db.refresh(usage)

    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == usage.material_id).first()
    return MaterialUsageResponse(
        **{c.name: getattr(usage, c.name) for c in usage.__table__.columns},
        material_name=material.name if material else None,
        material_unit=material.unit if material else None,
    )


@router.get("/material-usage", response_model=list[MaterialUsageResponse])
def list_material_usage(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_readable_project(db, project_id, current_user)
    records = db.query(MaterialUsage).filter(MaterialUsage.project_id == project_id).order_by(MaterialUsage.date.desc()).all()
    result = []
    for u in records:
        material = db.query(MaterialCatalog).filter(MaterialCatalog.id == u.material_id).first()
        result.append(MaterialUsageResponse(
            **{c.name: getattr(u, c.name) for c in u.__table__.columns},
            material_name=material.name if material else None,
            material_unit=material.unit if material else None,
        ))
    return result


# ==================== Material Requests ====================

@router.post("/material-requests", response_model=MaterialRequestResponse, status_code=201)
def create_material_request(
    project_id: int, payload: MaterialRequestCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Only site engineers can create material requests")

    _get_active_project(db, project_id, current_user)
    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    request = MaterialRequest(
        project_id=project_id, material_id=payload.material_id,
        quantity=payload.quantity, message=payload.message,
        requested_by=current_user.id,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    return MaterialRequestResponse(
        **{c.name: getattr(request, c.name) for c in request.__table__.columns},
        material_name=material.name, material_unit=material.unit,
        requester_name=current_user.full_name, approver_name=None,
    )


@router.get("/material-requests", response_model=list[MaterialRequestResponse])
def list_material_requests(
    project_id: int, status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_readable_project(db, project_id, current_user)
    query = db.query(MaterialRequest).filter(MaterialRequest.project_id == project_id)
    if status_filter:
        query = query.filter(MaterialRequest.status == status_filter)
    requests = query.order_by(MaterialRequest.created_at.desc()).all()

    result = []
    for req in requests:
        material = db.query(MaterialCatalog).filter(MaterialCatalog.id == req.material_id).first()
        requester = db.query(User).filter(User.id == req.requested_by).first()
        approver = db.query(User).filter(User.id == req.approved_by).first() if req.approved_by else None
        result.append(MaterialRequestResponse(
            **{c.name: getattr(req, c.name) for c in req.__table__.columns},
            material_name=material.name if material else None,
            material_unit=material.unit if material else None,
            requester_name=requester.full_name if requester else None,
            approver_name=approver.full_name if approver else None,
        ))
    return result


@router.patch("/material-requests/{request_id}", response_model=MaterialRequestResponse)
def action_material_request(
    project_id: int, request_id: int, payload: MaterialRequestAction,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.project_manager:
        raise HTTPException(status_code=403, detail="Only project managers can approve/reject requests")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your project")

    req = db.query(MaterialRequest).filter(
        MaterialRequest.id == request_id, MaterialRequest.project_id == project_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != MaterialRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already processed")

    try:
        new_status = MaterialRequestStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'approved' or 'rejected'")

    if new_status not in (MaterialRequestStatus.approved, MaterialRequestStatus.rejected):
        raise HTTPException(status_code=400, detail="Invalid action")

    req.status = new_status
    req.approved_by = current_user.id

    db.commit()
    db.refresh(req)

    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == req.material_id).first()
    requester = db.query(User).filter(User.id == req.requested_by).first()
    return MaterialRequestResponse(
        **{c.name: getattr(req, c.name) for c in req.__table__.columns},
        material_name=material.name if material else None,
        material_unit=material.unit if material else None,
        requester_name=requester.full_name if requester else None,
        approver_name=current_user.full_name,
    )
