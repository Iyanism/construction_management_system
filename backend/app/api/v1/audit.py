"""Audit log viewing for administrators."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogListResponse, AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_id: int | None = Query(None),
    action: str | None = Query(None),
):
    """Retrieve audit logs with pagination and filtering."""
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
        
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc())\
                .offset((page - 1) * page_size)\
                .limit(page_size).all()
                
    result = []
    for log in logs:
        # Enriched response with user name
        log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
        log_dict["user_name"] = log.user.full_name if log.user else "System"
        result.append(AuditLogResponse(**log_dict))
        
    return AuditLogListResponse(total=total, logs=result)
