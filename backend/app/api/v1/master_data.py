"""Master data routes: WorkerRole, WageRate, MaterialCatalog, Worker."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.master_data import MaterialCatalog, WageRate, Worker, WorkerRole, WorkerStatus
from app.models.user import User
from app.schemas.master_data import (
    MaterialCatalogCreate,
    MaterialCatalogResponse,
    MaterialCatalogUpdate,
    WageRateCreate,
    WageRateResponse,
    WageRateUpdate,
    WorkerCreate,
    WorkerResponse,
    WorkerRoleCreate,
    WorkerRoleResponse,
    WorkerRoleUpdate,
    WorkerUpdate,
)
from app.api.deps import require_admin, require_any

router = APIRouter(tags=["Master Data"])


# ==================== Worker Roles ====================

@router.get("/worker-roles", response_model=list[WorkerRoleResponse])
def list_worker_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List all worker roles."""
    roles = db.query(WorkerRole).order_by(WorkerRole.name).all()
    for role in roles:
        # Get the latest wage rate for this role
        latest_rate = db.query(WageRate)\
            .filter(WageRate.worker_role_id == role.id)\
            .order_by(WageRate.effective_from.desc())\
            .first()
        role.base_rate = latest_rate.daily_rate if latest_rate else 0.0
    return roles


@router.post("/worker-roles", response_model=WorkerRoleResponse, status_code=status.HTTP_201_CREATED)
def create_worker_role(
    payload: WorkerRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new worker role (Admin only)."""
    existing = db.query(WorkerRole).filter(WorkerRole.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Worker role already exists")

    role = WorkerRole(name=payload.name, description=payload.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/worker-roles/{role_id}", response_model=WorkerRoleResponse)
def update_worker_role(
    role_id: int,
    payload: WorkerRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a worker role (Admin only)."""
    role = db.query(WorkerRole).filter(WorkerRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker role not found")

    if payload.name is not None:
        existing = db.query(WorkerRole).filter(WorkerRole.name == payload.name, WorkerRole.id != role_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Name already in use")
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description

    db.commit()
    db.refresh(role)
    return role


@router.delete("/worker-roles/{role_id}", status_code=status.HTTP_200_OK)
def delete_worker_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a worker role (Admin only)."""
    role = db.query(WorkerRole).filter(WorkerRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker role not found")

    # Check if any workers use this role
    worker_count = db.query(Worker).filter(Worker.worker_role_id == role_id).count()
    if worker_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete: {worker_count} workers are assigned this role",
        )

    db.delete(role)
    db.commit()
    return {"message": "Worker role deleted"}


# ==================== Wage Rates ====================

@router.get("/wage-rates", response_model=list[WageRateResponse])
def list_wage_rates(
    worker_role_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List wage rates, optionally filtered by worker role."""
    query = db.query(WageRate)
    if worker_role_id:
        query = query.filter(WageRate.worker_role_id == worker_role_id)
    return query.order_by(WageRate.effective_from.desc()).all()


@router.post("/wage-rates", response_model=WageRateResponse, status_code=status.HTTP_201_CREATED)
def create_wage_rate(
    payload: WageRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new wage rate (Admin only)."""
    # Validate worker role exists
    role = db.query(WorkerRole).filter(WorkerRole.id == payload.worker_role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker role not found")

    rate = WageRate(
        worker_role_id=payload.worker_role_id,
        daily_rate=payload.daily_rate,
        effective_from=payload.effective_from,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


@router.put("/wage-rates/{rate_id}", response_model=WageRateResponse)
def update_wage_rate(
    rate_id: int,
    payload: WageRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a wage rate (Admin only)."""
    rate = db.query(WageRate).filter(WageRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wage rate not found")

    if payload.daily_rate is not None:
        rate.daily_rate = payload.daily_rate
    if payload.effective_from is not None:
        rate.effective_from = payload.effective_from

    db.commit()
    db.refresh(rate)
    return rate


@router.delete("/wage-rates/{rate_id}", status_code=status.HTTP_200_OK)
def delete_wage_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a wage rate (Admin only)."""
    rate = db.query(WageRate).filter(WageRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wage rate not found")
    db.delete(rate)
    db.commit()
    return {"message": "Wage rate deleted"}


# ==================== Material Catalog ====================

@router.get("/material-catalog", response_model=list[MaterialCatalogResponse])
def list_materials(
    category: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List material catalog with optional filters."""
    query = db.query(MaterialCatalog)
    if category:
        query = query.filter(MaterialCatalog.category == category)
    if search:
        query = query.filter(MaterialCatalog.name.ilike(f"%{search}%"))
    return query.order_by(MaterialCatalog.category, MaterialCatalog.name).all()


@router.post("/material-catalog", response_model=MaterialCatalogResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    payload: MaterialCatalogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Add a material to the catalog (Admin only)."""
    existing = db.query(MaterialCatalog).filter(MaterialCatalog.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Material already exists")

    material = MaterialCatalog(
        name=payload.name,
        unit=payload.unit,
        unit_price=payload.unit_price,
        category=payload.category,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.put("/material-catalog/{material_id}", response_model=MaterialCatalogResponse)
def update_material(
    material_id: int,
    payload: MaterialCatalogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a material in the catalog (Admin only)."""
    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    if payload.name is not None:
        existing = db.query(MaterialCatalog).filter(
            MaterialCatalog.name == payload.name, MaterialCatalog.id != material_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Name already in use")
        material.name = payload.name
    if payload.unit is not None:
        material.unit = payload.unit
    if payload.unit_price is not None:
        material.unit_price = payload.unit_price
    if payload.category is not None:
        material.category = payload.category

    db.commit()
    db.refresh(material)
    return material


@router.delete("/material-catalog/{material_id}", status_code=status.HTTP_200_OK)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a material from the catalog (Admin only)."""
    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}


# ==================== Workers ====================

@router.get("/workers", response_model=list[WorkerResponse])
def list_workers(
    worker_role_id: int | None = Query(None),
    status: str | None = Query(None),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List workers with optional filters."""
    query = db.query(Worker)
    if worker_role_id:
        query = query.filter(Worker.worker_role_id == worker_role_id)
    if status:
        query = query.filter(Worker.status == status)
    if is_active is not None:
        query = query.filter(Worker.is_active == is_active)
    if search:
        query = query.filter(Worker.name.ilike(f"%{search}%"))
    return query.order_by(Worker.name).all()


@router.get("/workers/available", response_model=list[WorkerResponse])
def list_available_workers(
    worker_role_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List available workers, optionally filtered by role. Used for auto-assignment."""
    query = db.query(Worker).filter(
        Worker.status == WorkerStatus.available,
        Worker.is_active,
    )
    if worker_role_id:
        query = query.filter(Worker.worker_role_id == worker_role_id)
    return query.order_by(Worker.name).all()


@router.post("/workers", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
def create_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Add a worker to the pool (Admin only)."""
    # Validate worker role exists
    role = db.query(WorkerRole).filter(WorkerRole.id == payload.worker_role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker role not found")

    worker = Worker(
        name=payload.name,
        phone=payload.phone,
        worker_role_id=payload.worker_role_id,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.get("/workers/{worker_id}", response_model=WorkerResponse)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get a specific worker."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    return worker


@router.put("/workers/{worker_id}", response_model=WorkerResponse)
def update_worker(
    worker_id: int,
    payload: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a worker (Admin only)."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    if payload.name is not None:
        worker.name = payload.name
    if payload.phone is not None:
        worker.phone = payload.phone
    if payload.worker_role_id is not None:
        role = db.query(WorkerRole).filter(WorkerRole.id == payload.worker_role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker role not found")
        worker.worker_role_id = payload.worker_role_id
    if payload.is_active is not None:
        worker.is_active = payload.is_active

    db.commit()
    db.refresh(worker)
    return worker


@router.delete("/workers/{worker_id}", status_code=status.HTTP_200_OK)
def deactivate_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a worker (Admin only, soft delete)."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    if worker.status == WorkerStatus.assigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate a worker currently assigned to a project",
        )

    worker.is_active = False
    db.commit()
    return {"message": "Worker deactivated"}
