"""
Authentication Service for Gujjar Petrolium Kot Gujjran.
Handles password verification with PBKDF2, brute-force lockout, JWT tokens,
user directory, and security audit events.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.constants import UserRole, AuditAction
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    check_brute_force_lockout,
    record_failed_login_attempt,
    reset_failed_login_attempts,
)
from app.services.audit_service import audit_service


class AuthService:
    def __init__(self):
        # Initial user directory with hashed passwords (PBKDF2-HMAC-SHA256)
        self._users: Dict[str, dict] = {
            settings.MANAGER_USERNAME.lower(): {
                "user_id": "USR-001",
                "username": settings.MANAGER_USERNAME,
                "name": settings.MANAGER_NAME,
                "role": UserRole.MANAGER,
                "password_hash": hash_password(settings.MANAGER_PASSWORD),
                "is_active": True,
            },
            settings.STAFF_USERNAME.lower(): {
                "user_id": "USR-002",
                "username": settings.STAFF_USERNAME,
                "name": "Kot Gujjran Operator",
                "role": UserRole.STAFF,
                "password_hash": hash_password(settings.STAFF_PASSWORD),
                "is_active": True,
            },
            settings.VIEWER_USERNAME.lower(): {
                "user_id": "USR-003",
                "username": settings.VIEWER_USERNAME,
                "name": "Audit Observer",
                "role": UserRole.READ_ONLY,
                "password_hash": hash_password(settings.VIEWER_PASSWORD),
                "is_active": True,
            },
        }

    def authenticate_user(
        self,
        username: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> dict:
        """
        Authenticates credentials against the user store.
        Applies brute-force lockout checks and logs security audit events.
        """
        clean_user = (username or "").strip().lower()
        brute_key = f"{clean_user}:{ip_address or '0.0.0.0'}"

        # 1. Check brute force lockout
        check_brute_force_lockout(brute_key)

        user = self._users.get(clean_user)
        if not user or not user.get("is_active"):
            record_failed_login_attempt(brute_key)
            audit_service.log_auth_event(
                action=AuditAction.LOGIN_FAILED,
                username=username,
                role="UNKNOWN",
                success=False,
                ip_address=ip_address,
                reason="User not found or inactive",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 2. Verify password
        if not verify_password(password, user["password_hash"]):
            record_failed_login_attempt(brute_key)
            audit_service.log_auth_event(
                action=AuditAction.LOGIN_FAILED,
                username=user["username"],
                role=user["role"].value,
                success=False,
                ip_address=ip_address,
                reason="Incorrect password",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 3. Successful login - clear lockout tracker
        reset_failed_login_attempts(brute_key)

        # 4. Generate JWT token
        token_data = {
            "sub": user["user_id"],
            "username": user["username"],
            "name": user["name"],
            "role": user["role"].value,
        }
        token = create_access_token(token_data)

        # 5. Record audit event
        audit_service.log_auth_event(
            action=AuditAction.LOGIN,
            username=user["username"],
            role=user["role"].value,
            success=True,
            ip_address=ip_address,
            reason="Successful authentication",
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user["user_id"],
                "username": user["username"],
                "name": user["name"],
                "role": user["role"].value,
            },
        }

    def logout_user(self, username: str, role: str, ip_address: Optional[str] = None):
        audit_service.log_auth_event(
            action=AuditAction.LOGOUT,
            username=username,
            role=role,
            success=True,
            ip_address=ip_address,
            reason="User initiated logout",
        )

    def get_user_by_username(self, username: str) -> Optional[dict]:
        return self._users.get((username or "").strip().lower())


auth_service = AuthService()
