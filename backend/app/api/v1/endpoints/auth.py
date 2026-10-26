"""
Authentication Endpoints for Gujjar Petrolium Kot Gujjran.
Supports login with brute-force protection, logout, session tokens, and current user profile.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.common import APIResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="Username (e.g. asad)")
    password: str = Field(..., min_length=4, max_length=100, description="User password")


class UserProfileResponse(BaseModel):
    id: str
    username: str
    name: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse


@router.post("/login", response_model=APIResponse[LoginResponse])
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
) -> APIResponse[LoginResponse]:
    """
    Authenticate administrative or pump staff user.
    Sets secure session cookie and returns signed JWT access token.
    Protected against brute-force attacks via sliding window lockout.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_result = auth_service.authenticate_user(
        username=payload.username,
        password=payload.password,
        ip_address=client_ip,
    )

    # Set secure HTTP-only cookie for web browsers
    # SameSite=Lax for normal navigational state, HttpOnly to guard against XSS
    response.set_cookie(
        key="access_token",
        value=auth_result["access_token"],
        max_age=auth_result["expires_in"],
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,  # False in dev, True in prod
    )

    return APIResponse(
        message="Login successful",
        message_ur="لاگ ان کامیاب رہا۔ خوش آمدید!",
        data=LoginResponse(**auth_result),
    )


@router.post("/logout", response_model=APIResponse[dict])
def logout(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
) -> APIResponse[dict]:
    """
    Logs out the current session and clears the session cookie.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_service.logout_user(
        username=current_user["username"],
        role=current_user["role"].value if hasattr(current_user["role"], "value") else str(current_user["role"]),
        ip_address=client_ip,
    )

    response.delete_cookie(key="access_token")

    return APIResponse(
        message="Logged out successfully",
        message_ur="کامیابی سے لاگ آؤٹ ہو گیا",
        data={"logged_out": True},
    )


@router.get("/me", response_model=APIResponse[UserProfileResponse])
def get_me(
    current_user: dict = Depends(get_current_user),
) -> APIResponse[UserProfileResponse]:
    """
    Returns current authenticated user details and active role.
    """
    return APIResponse(
        data=UserProfileResponse(
            id=current_user.get("user_id", "USR-000"),
            username=current_user.get("username", "user"),
            name=current_user.get("name", "User"),
            role=current_user.get("role").value if hasattr(current_user.get("role"), "value") else str(current_user.get("role")),
        )
    )
