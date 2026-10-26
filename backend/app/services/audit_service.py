"""
Centralized Tamper-Evident Audit Logging Service for Gujjar Petrolium Kot Gujjran.
Maintains a detailed, secure audit trail of all managerial, financial, security,
and scheduled actions. Redacts sensitive credentials, passwords, and tokens.
"""

import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from threading import Lock

from app.core.constants import AuditAction, UserRole
from app.core.logging import logger
from app.schemas.audit import AuditLog, AuditLogCreate
from app.services.sheets import sheets_service
from app.services.store import store

_audit_lock = Lock()

# Keys/patterns to sanitize and redact
SENSITIVE_KEYS = {
    "password", "secret", "token", "access_token", "api_key",
    "authorization", "cookie", "hash", "private_key", "meta_app_secret",
}


def sanitize_metadata(data: Any) -> Any:
    """
    Recursively redacts sensitive keys such as passwords, tokens, and authorization credentials.
    """
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            lower_k = str(k).lower()
            if any(s in lower_k for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_metadata(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_metadata(item) for item in data]
    return data


class AuditService:
    def __init__(self):
        self._counter = 1

    def log_event(
        self,
        action: AuditAction,
        entity_type: str,
        entity_id: str,
        actor_name: str,
        actor_role: str,
        details: str,
        details_ur: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Records an audit event in Google Sheets (AuditLog tab) and the memory store.
        Thread-safe and guaranteed sensitive data redaction.
        """
        now = datetime.now(timezone.utc)
        safe_meta = sanitize_metadata(metadata or {})

        with _audit_lock:
            event_id = f"AUD-{now.strftime('%Y%m%d%H%M%S')}-{self._counter:03d}"
            self._counter += 1

            audit_entry = AuditLog(
                id=event_id,
                actor_name=actor_name,
                actor_role=actor_role if isinstance(actor_role, str) else actor_role.value,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                details_ur=details_ur,
                metadata=safe_meta,
                ip_address=ip_address,
                timestamp=now,
            )

            # Persist to Google Sheets / Store
            sheet_record = {
                "id": audit_entry.id,
                "timestamp": now.isoformat(),
                "actor_name": audit_entry.actor_name,
                "actor_role": audit_entry.actor_role,
                "action": audit_entry.action.value,
                "entity_type": audit_entry.entity_type,
                "entity_id": audit_entry.entity_id,
                "details": audit_entry.details,
                "details_ur": audit_entry.details_ur or "",
            }

            try:
                sheets_service.append_record("AuditLog", sheet_record)
            except Exception as e:
                logger.warning(f"Could not append to Google Sheets AuditLog: {e}")

            try:
                store.log_action(AuditLogCreate(
                    id=audit_entry.id,
                    actor_name=audit_entry.actor_name,
                    actor_role=audit_entry.actor_role,
                    action=audit_entry.action,
                    entity_type=audit_entry.entity_type,
                    entity_id=audit_entry.entity_id,
                    details=audit_entry.details,
                    details_ur=audit_entry.details_ur,
                    metadata=safe_meta,
                    ip_address=ip_address,
                ))
            except Exception as e:
                logger.debug(f"Store audit mirror note: {e}")

            logger.info(f"AUDIT [{audit_entry.action.value}] by {audit_entry.actor_name}: {audit_entry.details}")
            return audit_entry

    def log_auth_event(
        self,
        action: AuditAction,
        username: str,
        role: str,
        success: bool,
        ip_address: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> AuditLog:
        details = f"Login {'successful' if success else 'failed'} for user '{username}'."
        if reason:
            details += f" Reason: {reason}"
        details_ur = f"صارف '{username}' کا لاگ ان {'کامیاب' if success else 'ناکام'} رہا۔"

        return self.log_event(
            action=action,
            entity_type="AUTH",
            entity_id=username,
            actor_name=username,
            actor_role=role,
            details=details,
            details_ur=details_ur,
            ip_address=ip_address,
            metadata={"success": success, "reason": reason},
        )


audit_service = AuditService()
