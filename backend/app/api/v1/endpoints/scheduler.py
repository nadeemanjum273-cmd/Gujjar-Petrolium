"""
Scheduler Endpoints for Gujjar Petrolium Kot Gujjran.
Manages automated overdue recovery reminders in Asia/Karachi timezone,
provides reviewable batch previews, and allows authorized managers to trigger runs.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import require_manager, require_authenticated
from app.schemas.common import APIResponse
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


class SchedulerStatusResponse(BaseModel):
    timezone: str = "Asia/Karachi"
    current_time_pkt: str
    auto_reminders_enabled: bool
    scheduled_time_pkt: str
    messaging_mode: str
    last_run_at: Optional[str] = None
    last_run_summary: Optional[Dict[str, Any]] = None


@router.get("/status", response_model=APIResponse[SchedulerStatusResponse])
def get_scheduler_status(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[SchedulerStatusResponse]:
    """
    Returns current reminder scheduler status, business timezone (Asia/Karachi),
    and historical run summaries.
    """
    now_pkt = scheduler_service.get_current_pkt_time()
    scheduled_time_str = f"{settings.SCHEDULER_HOUR_PKT:02d}:{settings.SCHEDULER_MINUTE_PKT:02d} PKT"

    status_data = SchedulerStatusResponse(
        timezone="Asia/Karachi",
        current_time_pkt=now_pkt.strftime("%Y-%m-%d %H:%M:%S %Z"),
        auto_reminders_enabled=settings.AUTO_REMINDERS_ENABLED,
        scheduled_time_pkt=scheduled_time_str,
        messaging_mode=settings.MESSAGING_MODE,
        last_run_at=scheduler_service.last_run_at.isoformat() if scheduler_service.last_run_at else None,
        last_run_summary=scheduler_service.last_run_summary,
    )
    return APIResponse(data=status_data)


@router.get("/preview", response_model=APIResponse[Dict[str, Any]])
def preview_scheduler_candidates(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[Dict[str, Any]]:
    """
    Generates a reviewable preview of overdue accounts eligible for reminder dispatch.
    Excludes inactive, opted-out, and recently reminded accounts.
    """
    evaluation = scheduler_service.evaluate_candidates()
    return APIResponse(
        message="Scheduler candidate evaluation preview generated",
        message_ur="واجب الادا کھاتوں کی فہرست تیار ہے",
        data=evaluation,
    )


@router.post("/run-now", response_model=APIResponse[Dict[str, Any]])
def run_scheduler_now(
    manager: dict = Depends(require_manager),
) -> APIResponse[Dict[str, Any]]:
    """
    Manually triggers an immediate scheduler execution.
    Requires MANAGER role (Muhammad Asad).
    Executes in DRY_RUN or LIVE mode according to configured MESSAGING_MODE.
    """
    summary = scheduler_service.run_scheduler_batch(
        actor_name=manager.get("name", "Muhammad Asad"),
    )
    return APIResponse(
        message="Scheduler batch executed successfully",
        message_ur="شیڈولر بیچ کامیابی سے مکمل ہوا",
        data=summary,
    )
