"""
Authentication, Password Hashing, JWT Session Tokens, Brute-Force Rate Limiting,
and Role-Based Access Control (RBAC) for Gujjar Petrolium Kot Gujjran.
"""

import hmac
import hashlib
import json
import base64
import os
import time
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta, timezone

from fastapi import Header, Cookie, HTTPException, status, Depends
from app.core.config import settings
from app.core.constants import UserRole


# =============================================================================
# Password Hashing & Verification (PBKDF2-HMAC-SHA256 - NIST Standard)
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a unique 16-byte random salt
    and 100,000 iterations. Format: pbkdf2_sha256$100000$salt_hex$hash_hex
    """
    salt = os.urandom(16)
    iterations = 100_000
    derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived_key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a plaintext password against a stored PBKDF2 hash using constant-time comparison.
    """
    if not hashed or not password:
        return False
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(expected_key, computed_key)
    except Exception:
        return False


# =============================================================================
# Signed JWT Session Tokens (HMAC-SHA256)
# =============================================================================

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _base64url_decode(data_str: str) -> bytes:
    padding = "=" * (4 - (len(data_str) % 4)) if len(data_str) % 4 != 0 else ""
    return base64.urlsafe_b64decode((data_str + padding).encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a cryptographically signed HMAC-SHA256 JWT access token.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    payload.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    })

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    header_b64 = _base64url_encode(header_bytes)
    payload_b64 = _base64url_encode(payload_bytes)

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict:
    """
    Validates signature and expiration of an access token.
    Raises HTTPException(401) on invalid signature, tampering, or expiration.
    """
    if not token or token.count(".") != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    header_b64, payload_b64, signature_b64 = token.split(".")
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()

    try:
        actual_sig = _base64url_decode(signature_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature validation failed. Untrusted or tampered token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Expiration check
    exp = payload.get("exp")
    if exp is not None:
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if now_ts > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication session expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return payload


# =============================================================================
# Brute-Force Rate Limiting (In-Memory Sliding Window)
# =============================================================================

# Stores {key: [(timestamp, count)]}
_FAILED_ATTEMPTS: Dict[str, List[float]] = {}
_MAX_FAILURES = 5
_LOCKOUT_SECONDS = 900  # 15 minutes lockout after 5 consecutive failures


def check_brute_force_lockout(key: str) -> None:
    """
    Checks whether a username or IP is temporarily locked out due to excessive failed logins.
    """
    now = time.time()
    attempts = _FAILED_ATTEMPTS.get(key, [])
    # Filter attempts within the lockout window
    recent_attempts = [t for t in attempts if now - t < _LOCKOUT_SECONDS]
    _FAILED_ATTEMPTS[key] = recent_attempts

    if len(recent_attempts) >= _MAX_FAILURES:
        remaining = int(_LOCKOUT_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Account temporarily locked. Please try again in {remaining} seconds.",
        )


def record_failed_login_attempt(key: str) -> None:
    now = time.time()
    if key not in _FAILED_ATTEMPTS:
        _FAILED_ATTEMPTS[key] = []
    _FAILED_ATTEMPTS[key].append(now)


def reset_failed_login_attempts(key: str) -> None:
    if key in _FAILED_ATTEMPTS:
        _FAILED_ATTEMPTS.pop(key, None)


# =============================================================================
# Authentication & RBAC Dependencies
# =============================================================================

def get_current_user(
    authorization: Optional[str] = Header(None),
    x_dev_manager_secret: Optional[str] = Header(None, alias="X-Dev-Manager-Secret"),
    access_token: Optional[str] = Cookie(None),
) -> dict:
    """
    Authenticates requests via:
    1. Authorization Bearer JWT Token
    2. Secure HTTP-only Cookie 'access_token'
    3. X-Dev-Manager-Secret (Automated test suite compatibility)
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
    elif access_token:
        token = access_token.strip()

    # Fallback to dev secret for automated testing & bootstrap
    if not token and x_dev_manager_secret:
        if x_dev_manager_secret == settings.ADMIN_SESSION_SECRET:
            return {
                "user_id": "USR-DEV-001",
                "username": settings.MANAGER_USERNAME,
                "name": settings.MANAGER_NAME,
                "role": UserRole.MANAGER,
            }

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)

    role_str = payload.get("role", "STAFF").upper()
    try:
        user_role = UserRole(role_str)
    except Exception:
        user_role = UserRole.STAFF

    return {
        "user_id": payload.get("sub", "USR-000"),
        "username": payload.get("username", "user"),
        "name": payload.get("name", "User"),
        "role": user_role,
    }


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory checking that current user has one of the allowed roles.
    """
    def _role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Requires one of {[r.value for r in allowed_roles]} role(s). Your role: {user_role.value if hasattr(user_role, 'value') else user_role}.",
            )
        return user
    return _role_checker


# Role-specific dependencies
require_manager = require_role([UserRole.MANAGER])
require_staff_or_manager = require_role([UserRole.MANAGER, UserRole.STAFF])
require_authenticated = require_role([UserRole.MANAGER, UserRole.STAFF, UserRole.READ_ONLY])

# Backward-compatible alias for Phase 1-4 endpoints
def verify_manager_write_access(
    user: dict = Depends(require_manager),
) -> dict:
    return {
        "actor_name": user.get("name", settings.MANAGER_NAME),
        "actor_role": user.get("role", UserRole.MANAGER).value if hasattr(user.get("role"), "value") else str(user.get("role")),
    }
