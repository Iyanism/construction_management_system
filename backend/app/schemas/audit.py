"""Audit log schemas."""

from datetime import datetime
from pydantic import BaseModel
from typing import List

class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    action: str
    entity_type: str | None
    entity_id: int | None
    details: str | None
    ip_address: str | None
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    total: int
    logs: List[AuditLogResponse]
