"""
Health Check Endpoint for Gujjar Petrolium Kot Gujjran.
"""

from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns application health status, business metadata, and active timezone."""
    return HealthResponse(
        status="ok",
        app_name=settings.BUSINESS_NAME,
        app_name_ur=settings.BUSINESS_NAME_UR,
        version="1.0.0",
        environment=settings.APP_ENV,
        server_time=datetime.utcnow(),
        timezone=settings.TIMEZONE,
        manager=settings.MANAGER_NAME,
    )
