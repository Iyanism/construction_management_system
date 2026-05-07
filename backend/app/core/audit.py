"""Audit logging utilities."""

import json
from typing import Any
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_action(
    db: Session,
    action: str,
    user_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: Any = None,
    request: Request | None = None
):
    """
    Records an action in the audit log.
    details can be a string or a dict (which will be JSON-encoded).
    """
    detail_str = None
    if details:
        if isinstance(details, (dict, list)):
            detail_str = json.dumps(details)
        else:
            detail_str = str(details)

    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=detail_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
