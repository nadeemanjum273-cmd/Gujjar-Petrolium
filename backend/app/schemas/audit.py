"""
Audit Log Schema for Gujjar Petrolium Kot Gujjran.
Maintains a tamper-evident record of all managerial, financial, and automated actions.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.core.constants import AuditAction


class AuditLogBase(BaseModel):
    actor_name: str = Field(default="Muhammad Asad", description="Name of user or system process performing action")
    actor_role: str = Field(default="MANAGER", description="MANAGER, OPERATOR, or SYSTEM")
    action: AuditAction = Field(..., description="Action taken (CREATE, UPDATE, APPROVE, REJECT, DELETE, LOGIN)")
    entity_type: str = Field(..., description="Target model (CUSTOMER, TRANSACTION, RECEIPT, SETTINGS, REMINDER)")
    entity_id: str = Field(..., description="Target entity ID")
    details: str = Field(..., description="Human-readable explanation of change")
    details_ur: Optional[str] = Field(None, description="Urdu translation of the audit event")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Diff or extra context")
    ip_address: Optional[str] = Field(None, description="Originating client IP address")


class AuditLogCreate(AuditLogBase):
    id: Optional[str] = None


class AuditLog(AuditLogBase):
    id: str = Field(..., description="Unique audit log ID (e.g. AUD-0001)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC event timestamp")
