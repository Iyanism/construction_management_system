"""Project CRUD, status transitions, and role-filtered queries."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import BUDGET_WARNING_THRESHOLD, UPLOAD_DIR, MAX_FILE_SIZE, MAX_FILES_PER_PROJECT
from app.models.user import User, UserRole
from app.models.project import (
    Project, ProjectStatus, ProjectWorkerAssignment, ProjectMaterialEstimate,
    ProjectMaterialStock, ProjectPhase, PhaseStatus, ProjectDocument,
)
from app.models.master_data import Worker, WorkerRole as WorkerRoleModel, WorkerStatus, MaterialCatalog
from app.models.operations import Attendance, DailyLog, MaterialRequest
from app.models.finance import FinancialTransaction
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectStatusUpdate, ProjectResponse,
    ProjectListResponse, AssignEngineerRequest, BulkAssignWorkersRequest,
    ProjectWorkerResponse, MaterialEstimateCreate, MaterialEstimateUpdate,
    MaterialEstimateResponse, MaterialStockResponse, PhaseCreate, PhaseUpdate,
    PhaseResponse, PhaseProgressUpdate, DocumentResponse, ProjectSummary,
)
from app.api.deps import get_current_user, require_pm
import uuid
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter(prefix="/projects", tags=["Projects"])


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _check_project_access(project: Project, user: User):
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.accountant:
        return
    if user.role == UserRole.project_manager and project.project_manager_id == user.id:
        return
    if user.role == UserRole.site_engineer and project.site_engineer_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Access denied to this project")


def _enrich_project(db: Session, project: Project) -> dict:
    pm = db.query(User).filter(User.id == project.project_manager_id).first()
    se = db.query(User).filter(User.id == project.site_engineer_id).first() if project.site_engineer_id else None
    progress = db.query(func.avg(ProjectPhase.progress_percentage)).filter(ProjectPhase.project_id == project.id).scalar() or 0
    total_spent = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.project_id == project.id
    ).scalar()
    budget_warning = total_spent >= (project.budget * BUDGET_WARNING_THRESHOLD) if project.budget > 0 else False

    return {
        **{c.name: getattr(project, c.name) for c in project.__table__.columns},
        "project_manager_name": pm.full_name if pm else None,
        "site_engineer_name": se.full_name if se else None,
        "progress_percentage": round(progress, 1),
        "budget_warning": budget_warning,
        "total_spent": float(total_spent),
    }


@router.get("", response_model=list[ProjectListResponse])
def list_projects(
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project)
    if current_user.role == UserRole.project_manager:
        query = query.filter(Project.project_manager_id == current_user.id)
    elif current_user.role == UserRole.site_engineer:
        query = query.filter(Project.site_engineer_id == current_user.id)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))

    projects = query.order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        data = _enrich_project(db, p)
        result.append(ProjectListResponse(**data))
    return result


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm),
):
    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    if payload.budget <= 0:
        raise HTTPException(status_code=400, detail="Budget must be positive")

    project = Project(
        name=payload.name, client_name=payload.client_name, location=payload.location,
        description=payload.description, start_date=payload.start_date, end_date=payload.end_date,
        budget=payload.budget, status=ProjectStatus.draft,
        project_manager_id=current_user.id, created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(**_enrich_project(db, project))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    return ProjectResponse(**_enrich_project(db, project))


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int, payload: ProjectUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    if current_user.role == UserRole.project_manager and project.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    if current_user.role not in (UserRole.admin, UserRole.project_manager):
        raise HTTPException(status_code=403, detail="Access denied")
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot edit completed project")

    for field in ["name", "client_name", "location", "description", "start_date", "end_date", "budget"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(project, field, val)
    project.updated_by = current_user.id
    db.commit()
    db.refresh(project)
    return ProjectResponse(**_enrich_project(db, project))


VALID_TRANSITIONS = {
    ProjectStatus.draft: [ProjectStatus.planning],
    ProjectStatus.planning: [ProjectStatus.active],
    ProjectStatus.active: [ProjectStatus.completed],
    ProjectStatus.completed: [],
}

@router.patch("/{project_id}/status", response_model=ProjectResponse)
def update_project_status(
    project_id: int, payload: ProjectStatusUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    if current_user.role == UserRole.project_manager and project.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    if current_user.role not in (UserRole.admin, UserRole.project_manager):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        new_status = ProjectStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    if new_status not in VALID_TRANSITIONS.get(project.status, []):
        raise HTTPException(status_code=400, detail=f"Cannot transition from {project.status.value} to {new_status.value}")

    if new_status == ProjectStatus.active and not project.site_engineer_id:
        raise HTTPException(status_code=400, detail="Assign a site engineer before activating")

    if new_status == ProjectStatus.completed:
        # Release all workers
        assignments = db.query(ProjectWorkerAssignment).filter(
            ProjectWorkerAssignment.project_id == project_id,
            ProjectWorkerAssignment.released_at.is_(None),
        ).all()
        for a in assignments:
            a.released_at = datetime.now(timezone.utc)
            worker = db.query(Worker).filter(Worker.id == a.worker_id).first()
            if worker:
                worker.status = WorkerStatus.available

    project.status = new_status
    project.updated_by = current_user.id
    db.commit()
    db.refresh(project)
    return ProjectResponse(**_enrich_project(db, project))


# ==================== Engineer Assignment ====================

@router.post("/{project_id}/assign-engineer", response_model=ProjectResponse)
def assign_engineer(
    project_id: int, payload: AssignEngineerRequest,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.project_manager_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your project")
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
        raise HTTPException(status_code=400, detail="Can only assign engineer during draft/planning")

    engineer = db.query(User).filter(User.id == payload.site_engineer_id, User.role == UserRole.site_engineer).first()
    if not engineer:
        raise HTTPException(status_code=404, detail="Site engineer not found")

    project.site_engineer_id = payload.site_engineer_id
    project.updated_by = current_user.id
    db.commit()
    db.refresh(project)
    return ProjectResponse(**_enrich_project(db, project))


# ==================== Bulk Worker Assignment ====================

@router.post("/{project_id}/assign-workers", response_model=list[ProjectWorkerResponse])
def assign_workers_bulk(
    project_id: int, payload: BulkAssignWorkersRequest,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.project_manager_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your project")
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning, ProjectStatus.active):
        raise HTTPException(status_code=400, detail="Cannot assign workers to completed project")

    created = []
    for item in payload.assignments:
        available = db.query(Worker).filter(
            Worker.worker_role_id == item.worker_role_id,
            Worker.status == WorkerStatus.available,
            Worker.is_active,
        ).limit(item.count).all()

        if len(available) < item.count:
            role = db.query(WorkerRoleModel).filter(WorkerRoleModel.id == item.worker_role_id).first()
            role_name = role.name if role else f"role_id={item.worker_role_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Not enough available workers for {role_name}: requested {item.count}, available {len(available)}",
            )

        for worker in available:
            assignment = ProjectWorkerAssignment(project_id=project_id, worker_id=worker.id)
            db.add(assignment)
            worker.status = WorkerStatus.assigned
            created.append(assignment)

    db.commit()
    for a in created:
        db.refresh(a)
    return created


@router.get("/{project_id}/workers", response_model=list[ProjectWorkerResponse])
def list_project_workers(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    return db.query(ProjectWorkerAssignment).filter(
        ProjectWorkerAssignment.project_id == project_id,
        ProjectWorkerAssignment.released_at.is_(None),
    ).all()


@router.delete("/{project_id}/workers/{worker_id}")
def release_worker(
    project_id: int, worker_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.project_manager_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your project")

    assignment = db.query(ProjectWorkerAssignment).filter(
        ProjectWorkerAssignment.project_id == project_id,
        ProjectWorkerAssignment.worker_id == worker_id,
        ProjectWorkerAssignment.released_at.is_(None),
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Worker assignment not found")

    assignment.released_at = datetime.now(timezone.utc)
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if worker:
        worker.status = WorkerStatus.available
    db.commit()
    return {"message": "Worker released"}


# ==================== Material Estimates ====================

@router.post("/{project_id}/material-estimates", response_model=MaterialEstimateResponse, status_code=201)
def add_material_estimate(
    project_id: int, payload: MaterialEstimateCreate,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.project_manager_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your project")
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
        raise HTTPException(status_code=400, detail="Can only add estimates during draft or planning phases")

    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    existing = db.query(ProjectMaterialEstimate).filter(
        ProjectMaterialEstimate.project_id == project_id,
        ProjectMaterialEstimate.material_id == payload.material_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Estimate for this material already exists")

    estimate = ProjectMaterialEstimate(
        project_id=project_id, material_id=payload.material_id,
        estimated_quantity=payload.estimated_quantity,
    )
    db.add(estimate)
    db.commit()
    db.refresh(estimate)
    return estimate


@router.get("/{project_id}/material-estimates", response_model=list[MaterialEstimateResponse])
def list_material_estimates(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    return db.query(ProjectMaterialEstimate).filter(ProjectMaterialEstimate.project_id == project_id).all()


@router.put("/{project_id}/material-estimates/{estimate_id}", response_model=MaterialEstimateResponse)
def update_material_estimate(
    project_id: int, estimate_id: int, payload: MaterialEstimateUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    estimate = db.query(ProjectMaterialEstimate).filter(
        ProjectMaterialEstimate.id == estimate_id, ProjectMaterialEstimate.project_id == project_id
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    
    project = _get_project_or_404(db, project_id)
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
        raise HTTPException(status_code=400, detail="Can only update estimates during draft or planning phases")
    estimate.estimated_quantity = payload.estimated_quantity
    db.commit()
    db.refresh(estimate)
    return estimate


@router.delete("/{project_id}/material-estimates/{estimate_id}")
def delete_material_estimate(
    project_id: int, estimate_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    estimate = db.query(ProjectMaterialEstimate).filter(
        ProjectMaterialEstimate.id == estimate_id, ProjectMaterialEstimate.project_id == project_id
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
        
    project = _get_project_or_404(db, project_id)
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
        raise HTTPException(status_code=400, detail="Can only delete estimates during draft or planning phases")
    db.delete(estimate)
    db.commit()
    return {"message": "Estimate deleted"}


# ==================== Material Stock ====================

@router.get("/{project_id}/materials/stock", response_model=list[MaterialStockResponse])
def get_material_stock(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    return db.query(ProjectMaterialStock).filter(ProjectMaterialStock.project_id == project_id).all()


# ==================== Phases ====================

@router.post("/{project_id}/phases", response_model=PhaseResponse, status_code=201)
def create_phase(
    project_id: int, payload: PhaseCreate,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.project_manager_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your project")
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Project is completed")

    phase = ProjectPhase(
        project_id=project_id, name=payload.name,
        description=payload.description, order=payload.order,
    )
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase


@router.get("/{project_id}/phases", response_model=list[PhaseResponse])
def list_phases(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    return db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).order_by(ProjectPhase.order).all()


@router.put("/{project_id}/phases/{phase_id}", response_model=PhaseResponse)
def update_phase(
    project_id: int, phase_id: int, payload: PhaseUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    
    if current_user.role == UserRole.project_manager:
        if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
            raise HTTPException(status_code=403, detail="Cannot edit roadmap once project is active")
    elif current_user.role == UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Site engineers must use the progress update endpoint")

    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    if payload.name is not None:
        phase.name = payload.name
    if payload.description is not None:
        phase.description = payload.description
    if payload.order is not None:
        phase.order = payload.order
    if payload.status is not None:
        try:
            phase.status = PhaseStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid phase status")

    db.commit()
    db.refresh(phase)
    return phase


@router.patch("/{project_id}/phases/{phase_id}/progress", response_model=PhaseResponse)
def update_phase_progress(
    project_id: int, phase_id: int, payload: PhaseProgressUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    
    if current_user.role != UserRole.site_engineer and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only site engineers can update execution progress")
    
    if project.status != ProjectStatus.active:
        raise HTTPException(status_code=400, detail="Can only update progress for active projects")
    
    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    if payload.progress_percentage < 0 or payload.progress_percentage > 100:
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")

    try:
        phase.status = PhaseStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid phase status")

    phase.progress_percentage = payload.progress_percentage
    
    # Auto-sync status if progress is 100
    if phase.progress_percentage == 100:
        phase.status = PhaseStatus.completed

    db.commit()
    db.refresh(phase)
    return phase


@router.delete("/{project_id}/phases/{phase_id}")
def delete_phase(
    project_id: int, phase_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(require_pm),
):
    project = _get_project_or_404(db, project_id)
    if project.status not in (ProjectStatus.draft, ProjectStatus.planning):
        raise HTTPException(status_code=403, detail="Cannot delete phases once project is active")

    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    db.delete(phase)
    db.commit()
    return {"message": "Phase deleted"}


# ==================== Documents ====================




@router.post("/{project_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    project_id: int, file: UploadFile = File(...),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    if project.status == ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="Project is completed")
    if current_user.role not in (UserRole.admin, UserRole.project_manager, UserRole.site_engineer):
        raise HTTPException(status_code=403, detail="Access denied")

    doc_count = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).count()
    if doc_count >= MAX_FILES_PER_PROJECT:
        raise HTTPException(status_code=400, detail=f"Max {MAX_FILES_PER_PROJECT} files per project")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")

    project_dir = UPLOAD_DIR / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = project_dir / filename

    with open(filepath, "wb") as f:
        f.write(content)

    doc = ProjectDocument(
        project_id=project_id, filename=filename,
        original_filename=file.filename, file_size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
    return DocumentResponse(
        **{c.name: getattr(doc, c.name) for c in doc.__table__.columns},
        uploader_name=uploader.full_name if uploader else None,
    )


@router.get("/{project_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).all()
    result = []
    for doc in docs:
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
        result.append(DocumentResponse(
            **{c.name: getattr(doc, c.name) for c in doc.__table__.columns},
            uploader_name=uploader.full_name if uploader else None,
        ))
    return result




@router.get("/{project_id}/documents/{doc_id}/download")
def download_document(
    project_id: int, doc_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)
    doc = db.query(ProjectDocument).filter(
        ProjectDocument.id == doc_id, ProjectDocument.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filepath = UPLOAD_DIR / str(project_id) / doc.filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path=str(filepath), filename=doc.original_filename)


@router.delete("/{project_id}/documents/{doc_id}")
def delete_document(
    project_id: int, doc_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_project_or_404(db, project_id)
    if current_user.role not in (UserRole.admin, UserRole.project_manager):
        raise HTTPException(status_code=403, detail="Access denied")

    doc = db.query(ProjectDocument).filter(
        ProjectDocument.id == doc_id, ProjectDocument.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filepath = UPLOAD_DIR / str(project_id) / doc.filename
    if filepath.exists():
        filepath.unlink()

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


# ==================== Project Summary ====================

@router.get("/{project_id}/summary", response_model=ProjectSummary)
def get_project_summary(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id)
    _check_project_access(project, current_user)

    total_workers = db.query(ProjectWorkerAssignment).filter(
        ProjectWorkerAssignment.project_id == project_id
    ).count()
    total_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).count()
    completed_phases = db.query(ProjectPhase).filter(
        ProjectPhase.project_id == project_id, ProjectPhase.status == PhaseStatus.completed
    ).count()
    total_spent = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.project_id == project_id
    ).scalar()

    return ProjectSummary(
        project=ProjectResponse(**_enrich_project(db, project)),
        total_workers=total_workers,
        total_phases=total_phases,
        completed_phases=completed_phases,
        total_material_estimates=db.query(ProjectMaterialEstimate).filter(ProjectMaterialEstimate.project_id == project_id).count(),
        total_material_stock_items=db.query(ProjectMaterialStock).filter(ProjectMaterialStock.project_id == project_id).count(),
        total_attendance_records=db.query(Attendance).filter(Attendance.project_id == project_id).count(),
        total_daily_logs=db.query(DailyLog).filter(DailyLog.project_id == project_id).count(),
        total_material_requests=db.query(MaterialRequest).filter(MaterialRequest.project_id == project_id).count(),
        total_financial_transactions=db.query(FinancialTransaction).filter(FinancialTransaction.project_id == project_id).count(),
        total_spent=float(total_spent),
        budget_remaining=project.budget - float(total_spent),
        budget_utilization_percentage=round(float(total_spent) / project.budget * 100, 1) if project.budget > 0 else 0,
    )
