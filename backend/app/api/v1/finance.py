"""Finance routes: Transactions, MaterialPurchases, LaborCosts, and Summaries."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import BUDGET_WARNING_THRESHOLD
from app.models.user import User, UserRole
from app.models.project import Project, ProjectMaterialStock
from app.models.master_data import MaterialCatalog, Worker, WageRate
from app.models.operations import Attendance, AttendanceStatus, MaterialUsage, MaterialRequest, MaterialRequestStatus
from app.models.finance import (
    MaterialPurchase, LaborCostEntry, FinancialTransaction,
    TransactionCategory, PaymentStatus,
)
from app.schemas.finance import (
    MaterialPurchaseCreate, MaterialPurchaseResponse,
    LaborCostGenerateRequest, LaborCostResponse, LaborCostPreviewResponse,
    TransactionCreate, TransactionUpdate, TransactionResponse,
    ProjectFinanceSummary, FinanceOverview,
    PendingItem, ProcessItemRequest,
    ProjectLite, ProjectFinancialDrilldown, ReconciliationSummary
)
from app.api.deps import get_current_user, require_accountant, require_admin_or_accountant

router = APIRouter(prefix="/finance", tags=["Finance"])


# ==================== Material Purchases ====================

@router.post("/material-purchases", response_model=MaterialPurchaseResponse, status_code=201)
def create_material_purchase(
    payload: MaterialPurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Record a material purchase. Automatically updates stock and creates a financial transaction."""
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    material = db.query(MaterialCatalog).filter(MaterialCatalog.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    total_cost = payload.quantity * payload.unit_price

    # 1. Create Purchase
    purchase = MaterialPurchase(
        project_id=payload.project_id,
        material_id=payload.material_id,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_cost=total_cost,
        date=payload.date,
        payment_status=PaymentStatus(payload.payment_status),
        recorded_by=current_user.id,
    )
    db.add(purchase)
    db.flush()  # To get purchase.id

    # 2. Update Stock
    stock = db.query(ProjectMaterialStock).filter(
        ProjectMaterialStock.project_id == payload.project_id,
        ProjectMaterialStock.material_id == payload.material_id,
    ).first()
    
    if stock:
        stock.quantity_available += payload.quantity
    else:
        stock = ProjectMaterialStock(
            project_id=payload.project_id,
            material_id=payload.material_id,
            quantity_available=payload.quantity,
            quantity_used=0.0,
        )
        db.add(stock)

    # 3. Create Transaction
    desc = f"Purchase of {payload.quantity} {material.unit} of {material.name}"
    transaction = FinancialTransaction(
        project_id=payload.project_id,
        category=TransactionCategory.material_purchase,
        description=desc,
        amount=total_cost,
        date=payload.date,
        payment_status=PaymentStatus(payload.payment_status),
        source_id=purchase.id,
        source_type="material_purchase",
        recorded_by=current_user.id,
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(purchase)

    return MaterialPurchaseResponse(
        **{c.name: getattr(purchase, c.name) for c in purchase.__table__.columns},
        material_name=material.name,
        material_unit=material.unit,
        project_name=project.name,
    )


@router.get("/material-purchases", response_model=list[MaterialPurchaseResponse])
def list_material_purchases(
    project_id: int | None = None,
    material_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.accountant) and not project_id:
        raise HTTPException(status_code=400, detail="Must specify project_id to view purchases")
        
    query = db.query(MaterialPurchase)
    if project_id:
        # Access check
        if current_user.role == UserRole.project_manager:
            proj = db.query(Project).filter(Project.id == project_id, Project.project_manager_id == current_user.id).first()
            if not proj:
                raise HTTPException(status_code=403, detail="Not your project")
        query = query.filter(MaterialPurchase.project_id == project_id)
        
    purchases = query.order_by(MaterialPurchase.date.desc()).all()
    
    result = []
    for p in purchases:
        material = db.query(MaterialCatalog).filter(MaterialCatalog.id == p.material_id).first()
        proj = db.query(Project).filter(Project.id == p.project_id).first()
        result.append(MaterialPurchaseResponse(
            **{c.name: getattr(p, c.name) for c in p.__table__.columns},
            material_name=material.name if material else None,
            material_unit=material.unit if material else None,
            project_name=proj.name if proj else None,
        ))
    return result


# ==================== Labor Costs ====================

def _generate_labor_cost(
    payload: LaborCostGenerateRequest,
    db: Session,
    current_user: User,
    override_amount: float | None = None,
    override_reason: str | None = None,
):
    """Calculate labor cost from attendance and generate a transaction."""
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(LaborCostEntry).filter(
        LaborCostEntry.project_id == payload.project_id,
        LaborCostEntry.date == payload.date,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Labor cost for {payload.date} already generated")

    attendances = db.query(Attendance).filter(
        Attendance.project_id == payload.project_id,
        Attendance.date == payload.date,
        Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.half_day]),
    ).all()

    if not attendances:
        raise HTTPException(status_code=400, detail="No attendance records found for this date to calculate costs")

    total_amount = 0.0
    total_workers = len(attendances)
    
    # Cache wage rates
    wage_rates_cache = {} # worker_role_id -> daily_rate
    
    def get_wage_rate(role_id: int, target_date: date):
        if role_id in wage_rates_cache:
            return wage_rates_cache[role_id]
        # Find latest applicable wage rate
        rate = db.query(WageRate).filter(
            WageRate.worker_role_id == role_id,
            WageRate.effective_from <= target_date
        ).order_by(WageRate.effective_from.desc()).first()
        
        val = rate.daily_rate if rate else 0.0
        wage_rates_cache[role_id] = val
        return val

    for att in attendances:
        worker = db.query(Worker).filter(Worker.id == att.worker_id).first()
        if not worker:
            continue
        
        daily_rate = get_wage_rate(worker.worker_role_id, payload.date)
        
        if att.status == AttendanceStatus.present:
            total_amount += daily_rate
        elif att.status == AttendanceStatus.half_day:
            total_amount += daily_rate * 0.5
            
    original_amount = total_amount
    if override_amount is not None:
        total_amount = override_amount

    # Create LaborCostEntry
    labor_cost = LaborCostEntry(
        project_id=payload.project_id,
        date=payload.date,
        total_workers=total_workers,
        total_amount=total_amount,
        generated_by=current_user.id,
    )
    db.add(labor_cost)
    db.flush()

    # Create Transaction
    desc = f"Labor costs for {total_workers} workers on {payload.date}"
    transaction = FinancialTransaction(
        project_id=payload.project_id,
        category=TransactionCategory.labor_cost,
        description=desc,
        amount=total_amount,
        date=payload.date,
        payment_status=PaymentStatus.pending,
        source_id=labor_cost.id,
        source_type="labor_cost",
        recorded_by=current_user.id,
        override_flag=override_amount is not None,
        original_amount=original_amount if override_amount is not None else None,
        override_reason=override_reason
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(labor_cost)

    return LaborCostResponse(
        **{c.name: getattr(labor_cost, c.name) for c in labor_cost.__table__.columns},
        project_name=project.name,
    )

@router.post("/labor-costs/generate", response_model=LaborCostResponse, status_code=201)
def generate_labor_cost(
    payload: LaborCostGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    return _generate_labor_cost(payload, db, current_user)


@router.get("/labor-costs/preview", response_model=LaborCostPreviewResponse)
def preview_labor_cost(
    project_id: int,
    date_val: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Preview labor cost calculation before generating."""
    existing = db.query(LaborCostEntry).filter(
        LaborCostEntry.project_id == project_id,
        LaborCostEntry.date == date_val,
    ).first()
    
    attendances = db.query(Attendance).filter(
        Attendance.project_id == project_id,
        Attendance.date == date_val,
        Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.half_day]),
    ).all()

    total_amount = 0.0
    wage_rates_cache = {}
    
    def get_wage_rate(role_id: int, dt: date):
        if role_id in wage_rates_cache:
            return wage_rates_cache[role_id]
        rate = db.query(WageRate).filter(
            WageRate.worker_role_id == role_id,
            WageRate.effective_from <= dt
        ).order_by(WageRate.effective_from.desc()).first()
        val = rate.daily_rate if rate else 0.0
        wage_rates_cache[role_id] = val
        return val

    for att in attendances:
        worker = db.query(Worker).filter(Worker.id == att.worker_id).first()
        if not worker:
            continue
        daily_rate = get_wage_rate(worker.worker_role_id, date_val)
        if att.status == AttendanceStatus.present:
            total_amount += daily_rate
        elif att.status == AttendanceStatus.half_day:
            total_amount += daily_rate * 0.5

    return LaborCostPreviewResponse(
        project_id=project_id,
        date=date_val,
        total_workers=len(attendances),
        estimated_amount=total_amount,
        is_already_generated=existing is not None
    )


@router.get("/labor-costs", response_model=list[LaborCostResponse])
def list_labor_costs(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.accountant) and not project_id:
        raise HTTPException(status_code=400, detail="Must specify project_id to view labor costs")
        
    query = db.query(LaborCostEntry)
    if project_id:
        if current_user.role == UserRole.project_manager:
            proj = db.query(Project).filter(Project.id == project_id, Project.project_manager_id == current_user.id).first()
            if not proj:
                raise HTTPException(status_code=403, detail="Not your project")
        query = query.filter(LaborCostEntry.project_id == project_id)
        
    costs = query.order_by(LaborCostEntry.date.desc()).all()
    
    result = []
    for c in costs:
        proj = db.query(Project).filter(Project.id == c.project_id).first()
        result.append(LaborCostResponse(
            **{col.name: getattr(c, col.name) for col in c.__table__.columns},
            project_name=proj.name if proj else None,
        ))
    return result


# ==================== Transactions ====================

@router.post("/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        cat = TransactionCategory(payload.category)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category")

    try:
        status_enum = PaymentStatus(payload.payment_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    transaction = FinancialTransaction(
        project_id=payload.project_id,
        category=cat,
        description=payload.description,
        amount=payload.amount,
        date=payload.date,
        payment_status=status_enum,
        recorded_by=current_user.id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return TransactionResponse(
        **{c.name: getattr(transaction, c.name) for c in transaction.__table__.columns},
        project_name=project.name,
        recorder_name=current_user.full_name,
    )


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    project_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.accountant) and not project_id:
        raise HTTPException(status_code=400, detail="Must specify project_id to view transactions")
        
    query = db.query(FinancialTransaction)
    if project_id:
        if current_user.role == UserRole.project_manager:
            proj = db.query(Project).filter(Project.id == project_id, Project.project_manager_id == current_user.id).first()
            if not proj:
                raise HTTPException(status_code=403, detail="Not your project")
        query = query.filter(FinancialTransaction.project_id == project_id)
        
    if category:
        query = query.filter(FinancialTransaction.category == category)
        
    transactions = query.order_by(FinancialTransaction.date.desc(), FinancialTransaction.id.desc()).all()
    
    result = []
    for t in transactions:
        proj = db.query(Project).filter(Project.id == t.project_id).first()
        rec = db.query(User).filter(User.id == t.recorded_by).first()
        result.append(TransactionResponse(
            **{col.name: getattr(t, col.name) for col in t.__table__.columns},
            project_name=proj.name if proj else None,
            recorder_name=rec.full_name if rec else None,
        ))
    return result


@router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    transaction = db.query(FinancialTransaction).filter(FinancialTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.description is not None:
        transaction.description = payload.description
    if payload.amount is not None:
        # Don't allow changing amount if linked to material purchase/labor cost
        if transaction.source_id is not None:
            raise HTTPException(status_code=400, detail="Cannot edit amount of linked transaction. Edit the source record instead.")
        transaction.amount = payload.amount
    if payload.date is not None:
        transaction.date = payload.date
    if payload.payment_status is not None:
        try:
            transaction.payment_status = PaymentStatus(payload.payment_status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payment status")
    if payload.category is not None:
        if transaction.source_id is not None:
            raise HTTPException(status_code=400, detail="Cannot edit category of linked transaction.")
        try:
            transaction.category = TransactionCategory(payload.category)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category")

    db.commit()
    db.refresh(transaction)
    
    proj = db.query(Project).filter(Project.id == transaction.project_id).first()
    rec = db.query(User).filter(User.id == transaction.recorded_by).first()

    return TransactionResponse(
        **{c.name: getattr(transaction, c.name) for c in transaction.__table__.columns},
        project_name=proj.name if proj else None,
        recorder_name=rec.full_name if rec else None,
    )


# ==================== Pending Items & Processing ====================

@router.get("/pending-items", response_model=list[PendingItem])
def get_pending_financial_items(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """
    Items awaiting accountant action:
    1. Approved material requests (not yet converted to purchases)
    2. Material usage logs (not yet converted to financial burn)
    3. Attendance dates (not yet converted to LaborCostEntry)
    """
    pending = []
    
    # 1. Approved Material Requests (Requests that haven't been purchased yet)
    req_query = db.query(MaterialRequest).filter(
        MaterialRequest.status == MaterialRequestStatus.approved
    )
    if project_id:
        req_query = req_query.filter(MaterialRequest.project_id == project_id)
        
    reqs = req_query.all()
    for r in reqs:
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == r.material_id).first()
        p = db.query(Project).filter(Project.id == r.project_id).first()
        pending.append(PendingItem(
            id=f"material_request:{r.id}",
            type="material_request",
            project_id=r.project_id,
            project_name=p.name if p else "Unknown",
            description=f"Approved request: {r.quantity} {m.unit if m else ''} of {m.name if m else 'Material'}",
            amount=r.quantity * (m.unit_price if m else 0),
            date=r.created_at.date()
        ))

    # 2. Material Usage (not yet in transactions)
    usage_query = db.query(MaterialUsage).filter(
        ~db.query(FinancialTransaction).filter(
            FinancialTransaction.source_type == "material_usage",
            FinancialTransaction.source_id == MaterialUsage.id
        ).exists()
    )
    if project_id:
        usage_query = usage_query.filter(MaterialUsage.project_id == project_id)
        
    usages = usage_query.all()
    
    for u in usages:
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == u.material_id).first()
        p = db.query(Project).filter(Project.id == u.project_id).first()
        pending.append(PendingItem(
            id=f"material_usage:{u.id}",
            type="material_usage",
            project_id=u.project_id,
            project_name=p.name if p else "Unknown",
            description=f"Site Usage: {u.quantity_used} {m.unit if m else ''} of {m.name if m else 'Material'}",
            amount=u.quantity_used * (m.unit_price if m else 0),
            date=u.date
        ))

    # 3. Attendance days not yet converted to LaborCostEntry
    att_query = db.query(Attendance.project_id, Attendance.date).distinct()
    if project_id:
        att_query = att_query.filter(Attendance.project_id == project_id)
        
    attendance_dates = att_query.all()
    for pid, dt in attendance_dates:
        exists = db.query(LaborCostEntry).filter(
            LaborCostEntry.project_id == pid,
            LaborCostEntry.date == dt
        ).first()
        if not exists:
            p = db.query(Project).filter(Project.id == pid).first()
            pending.append(PendingItem(
                id=f"labor_cost:{pid}:{dt.isoformat()}",
                type="labor_cost",
                project_id=pid,
                project_name=p.name if p else "Unknown",
                description=f"Unprocessed attendance batch for {dt}",
                amount=0, 
                date=dt
            ))
            
    return pending


@router.post("/process-item", status_code=200)
def process_financial_item(
    payload: ProcessItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    type_str, item_id = payload.item_id.split(":", 1)
    
    # Handle Reject Action
    if payload.action == "reject":
        if type_str == "material_request":
            req = db.query(MaterialRequest).filter(MaterialRequest.id == int(item_id)).first()
            if not req:
                raise HTTPException(status_code=404, detail="Request not found")
            req.status = MaterialRequestStatus.rejected
            db.commit()
            return {"message": "Material request rejected"}
        elif type_str == "labor_cost":
            # For labor cost, we don't have a 'status' to mark, 
            # we just don't generate the entry. 
            # But the accountant might want to dismiss it from the pending list.
            return {"message": "Labor cost entry dismissed"}
        elif type_str == "material_usage":
            # Material usage is an observation, rejecting it means we ignore its cost
            return {"message": "Material usage dismissed"}
        return {"message": f"Action {payload.action} for {type_str} not fully defined"}

    # Handle Approve Action (Default)
    if type_str == "material_usage":
        usage = db.query(MaterialUsage).filter(MaterialUsage.id == int(item_id)).first()
        if not usage:
            raise HTTPException(status_code=404, detail="Usage not found")
        
        exists = db.query(FinancialTransaction).filter(
            FinancialTransaction.source_type == "material_usage",
            FinancialTransaction.source_id == usage.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Already processed")
        
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == usage.material_id).first()
        original_cost = usage.quantity_used * (m.unit_price if m else 0)
        final_cost = payload.override_amount if payload.override_amount is not None else original_cost
        
        tx = FinancialTransaction(
            project_id=usage.project_id,
            category=TransactionCategory.material_usage,
            description=f"Usage Burn: {usage.quantity_used} {m.unit if m else ''} of {m.name if m else 'Material'}",
            amount=final_cost,
            date=usage.date,
            payment_status=PaymentStatus.paid,
            source_id=usage.id,
            source_type="material_usage",
            recorded_by=current_user.id,
            override_flag=payload.override_amount is not None,
            original_amount=original_cost if payload.override_amount is not None else None,
            override_reason=payload.override_reason
        )
        db.add(tx)
        db.commit()
        return {"message": "Material usage processed into transaction"}

    elif type_str == "labor_cost":
        pid_str, date_str = item_id.split(":", 1)
        return _generate_labor_cost(
            LaborCostGenerateRequest(project_id=int(pid_str), date=date.fromisoformat(date_str)),
            db, 
            current_user,
            override_amount=payload.override_amount,
            override_reason=payload.override_reason
        )

    elif type_str == "material_request":
        req = db.query(MaterialRequest).filter(MaterialRequest.id == int(item_id)).first()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req.status != MaterialRequestStatus.approved:
            raise HTTPException(status_code=400, detail="Only approved requests can be processed")
            
        m = db.query(MaterialCatalog).filter(MaterialCatalog.id == req.material_id).first()
        if not m:
            raise HTTPException(status_code=404, detail="Material not found in catalog")
        
        # Calculate Costs with potential overrides
        final_quantity = payload.override_quantity if payload.override_quantity is not None else req.quantity
        final_unit_price = payload.override_unit_price if payload.override_unit_price is not None else m.unit_price
        
        original_total = req.quantity * m.unit_price
        final_total = final_quantity * final_unit_price
        
        # 1. Create Purchase
        purchase = MaterialPurchase(
            project_id=req.project_id,
            material_id=req.material_id,
            quantity=final_quantity,
            unit_price=final_unit_price,
            total_cost=final_total,
            date=date.today(),
            payment_status=PaymentStatus.paid,
            recorded_by=current_user.id
        )
        db.add(purchase)
        db.flush()
        
        # 2. Update Stock
        stock = db.query(ProjectMaterialStock).filter(
            ProjectMaterialStock.project_id == req.project_id,
            ProjectMaterialStock.material_id == req.material_id
        ).first()
        if stock:
            stock.quantity_available += final_quantity
        else:
            stock = ProjectMaterialStock(
                project_id=req.project_id,
                material_id=req.material_id,
                quantity_available=final_quantity,
                quantity_used=0.0
            )
            db.add(stock)
            
        # 3. Create Transaction
        tx = FinancialTransaction(
            project_id=req.project_id,
            category=TransactionCategory.material_purchase,
            description=f"Fulfillment of Request #{req.id}: {final_quantity} {m.unit} of {m.name}",
            amount=final_total,
            date=date.today(),
            payment_status=PaymentStatus.paid,
            source_id=purchase.id,
            source_type="material_purchase",
            recorded_by=current_user.id,
            override_flag=(payload.override_quantity is not None or payload.override_unit_price is not None),
            original_amount=original_total if (payload.override_quantity is not None or payload.override_unit_price is not None) else None,
            override_reason=payload.override_reason
        )
        db.add(tx)
        
        # 4. Mark Request as Fulfilled
        req.status = MaterialRequestStatus.fulfilled
        
        db.commit()
        return {"message": "Material request processed into purchase and transaction"}

    return {"message": f"Action {payload.action} for {type_str} not fully defined"}


# ==================== Summaries ====================

@router.get("/projects/{project_id}/summary", response_model=ProjectFinanceSummary)
def get_project_finance_summary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role == UserRole.project_manager and project.project_manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    elif current_user.role == UserRole.site_engineer:
        raise HTTPException(status_code=403, detail="Site engineers cannot view financial summaries")

    transactions = db.query(FinancialTransaction).filter(FinancialTransaction.project_id == project_id).all()
    
    total_spent = sum(t.amount for t in transactions)
    by_category = {c.value: 0.0 for c in TransactionCategory}
    payment_summary = {s.value: 0.0 for s in PaymentStatus}
    
    for t in transactions:
        by_category[t.category.value] += t.amount
        payment_summary[t.payment_status.value] += t.amount

    return ProjectFinanceSummary(
        project_id=project.id,
        project_name=project.name,
        budget=project.budget,
        total_spent=total_spent,
        budget_remaining=project.budget - total_spent,
        budget_utilization_percentage=round(total_spent / project.budget * 100, 1) if project.budget > 0 else 0.0,
        budget_warning=total_spent >= (project.budget * BUDGET_WARNING_THRESHOLD) if project.budget > 0 else False,
        by_category=by_category,
        payment_summary=payment_summary,
    )


@router.get("/overview", response_model=FinanceOverview)
def get_finance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_accountant),
):
    """Global financial overview for accountants."""
    projects = db.query(Project).all()
    active_projects = [p for p in projects if p.status == "active"]
    
    total_budget = sum(p.budget for p in projects)
    
    total_spent_query = db.query(func.sum(FinancialTransaction.amount)).scalar()
    total_spent = total_spent_query or 0.0
    
    global_by_category = {c.value: 0.0 for c in TransactionCategory}
    
    project_summaries = []
    for p in projects:
        summary = get_project_finance_summary(p.id, db, current_user)
        project_summaries.append(summary)
        for cat, amt in summary.by_category.items():
            global_by_category[cat] += amt

    total_remaining = total_budget - total_spent
    
    # Recent transactions (last 5)
    recent_txs = db.query(FinancialTransaction).order_by(FinancialTransaction.date.desc(), FinancialTransaction.id.desc()).limit(5).all()
    tx_list = []
    for t in recent_txs:
        proj = db.query(Project).filter(Project.id == t.project_id).first()
        rec = db.query(User).filter(User.id == t.recorded_by).first()
        tx_list.append(TransactionResponse(
            **{col.name: getattr(t, col.name) for col in t.__table__.columns},
            project_name=proj.name if proj else None,
            recorder_name=rec.full_name if rec else None,
        ))
        
    # Pending items count
    pending_items = get_pending_financial_items(db=db, current_user=current_user)

    return FinanceOverview(
        total_projects=len(projects),
        total_active_projects=len(active_projects),
        total_budget=total_budget,
        total_spent=total_spent,
        total_remaining=total_remaining,
        global_by_category=global_by_category,
        projects=project_summaries,
        pending_items_count=len(pending_items),
        recent_transactions=tx_list,
    )


@router.get("/projects/lite", response_model=list[ProjectLite])
def list_projects_lite(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Lightweight project list for accountants."""
    projects = db.query(Project).all()
    result = []
    for p in projects:
        total_spent = db.query(func.sum(FinancialTransaction.amount)).filter(FinancialTransaction.project_id == p.id).scalar() or 0.0
        result.append(ProjectLite(
            id=p.id,
            name=p.name,
            budget=p.budget,
            total_spent=total_spent
        ))
    return result


@router.get("/projects/{project_id}/drilldown", response_model=ProjectFinancialDrilldown)
def get_project_drilldown(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Detailed financial drilldown for a single project."""
    summary = get_project_finance_summary(project_id, db, current_user)
    transactions = list_transactions(project_id=project_id, db=db, current_user=current_user)
    labor_costs = list_labor_costs(project_id=project_id, db=db, current_user=current_user)
    material_purchases = list_material_purchases(project_id=project_id, db=db, current_user=current_user)
    pending_items = get_pending_financial_items(project_id=project_id, db=db, current_user=current_user)

    return ProjectFinancialDrilldown(
        summary=summary,
        transactions=transactions,
        labor_costs=labor_costs,
        material_purchases=material_purchases,
        pending_items=pending_items
    )


@router.get("/reconciliation", response_model=ReconciliationSummary)
def get_reconciliation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Audit summary of operational vs processed records."""
    # Operational Records
    total_att_dates = db.query(Attendance.project_id, Attendance.date).distinct().count()
    total_usage = db.query(MaterialUsage).count()
    total_requests = db.query(MaterialRequest).filter(MaterialRequest.status == MaterialRequestStatus.approved).count()
    
    total_operational = total_att_dates + total_usage + total_requests
    
    # Processed (Transactions linked to these types)
    processed_usage = db.query(FinancialTransaction).filter(FinancialTransaction.source_type == "material_usage").count()
    processed_labor = db.query(LaborCostEntry).count()
    # Note: Requests are processed into MaterialPurchases, which create transactions
    processed_requests = db.query(MaterialPurchase).filter(
        db.query(MaterialRequest).filter(
            MaterialRequest.project_id == MaterialPurchase.project_id,
            MaterialRequest.material_id == MaterialPurchase.material_id
        ).exists()
    ).count() # This is a bit loose but works for a summary
    
    total_processed = processed_usage + processed_labor + processed_requests
    
    pending_items = get_pending_financial_items(db=db, current_user=current_user)
    
    processed_amount = db.query(func.sum(FinancialTransaction.amount)).scalar() or 0.0
    pending_amount = sum(item.amount for item in pending_items)
    
    return ReconciliationSummary(
        total_operational_records=total_operational,
        total_processed_records=total_processed,
        total_pending_records=len(pending_items),
        total_processed_amount=processed_amount,
        total_pending_amount=pending_amount
    )
