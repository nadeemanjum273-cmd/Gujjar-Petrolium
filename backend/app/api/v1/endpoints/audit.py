"""
Audit Log Endpoints for Gujjar Petrolium Kot Gujjran.
Reads managerial action trails from the Google Sheets AuditLog tab.
Protected by authentication.
"""

from typing import List
from datetime import datetime, timezone
import dateutil.parser
from fastapi import APIRouter, Depends
from app.core.constants import AuditAction
from app.core.security import require_authenticated
from app.schemas.audit import AuditLog
from app.schemas.common import APIResponse
from app.services.sheets import sheets_service

router = APIRouter(prefix="/audit", tags=["Audit Log"])


def _row_to_audit(row: dict) -> AuditLog:
    ts_str = str(row.get("timestamp", ""))
    try:
        ts = dateutil.parser.parse(ts_str) if ts_str else datetime.now(timezone.utc)
    except Exception:
        ts = datetime.now(timezone.utc)

    action_str = str(row.get("action", "UPDATE")).strip().upper()
    action_val = AuditAction(action_str) if action_str in [a.value for a in AuditAction] else AuditAction.UPDATE

    return AuditLog(
        id=str(row.get("id", "")).strip(),
        actor_name=str(row.get("actor_name", "Muhammad Asad")).strip(),
        actor_role=str(row.get("actor_role", "MANAGER")).strip(),
        action=action_val,
        entity_type=str(row.get("entity_type", "TRANSACTION")).strip(),
        entity_id=str(row.get("entity_id", "")).strip(),
        details=str(row.get("details", "")).strip(),
        details_ur=str(row.get("details_ur", "")).strip() or None,
        timestamp=ts,
    )


@router.get("", response_model=APIResponse[List[AuditLog]])
def list_audit_logs(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[List[AuditLog]]:
    """Retrieve chronologically ordered audit logs from Google Sheets."""
    rows = sheets_service.read_records("AuditLog")
    logs = [_row_to_audit(r) for r in rows if r.get("id")]
    logs.sort(key=lambda x: x.timestamp, reverse=True)
    return APIResponse(data=logs)
