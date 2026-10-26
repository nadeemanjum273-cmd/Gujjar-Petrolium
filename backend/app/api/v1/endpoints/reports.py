"""
Reports Endpoints for Gujjar Petrolium Kot Gujjran.
Protected by authentication (accessible by MANAGER, STAFF, and READ_ONLY).
"""

from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.core.security import require_authenticated
from app.schemas.ledger import OverdueReportResponse, PumpFinancialSummary
from app.schemas.common import APIResponse
from app.services.ledger_service import ledger_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/overdue", response_model=APIResponse[OverdueReportResponse])
def get_overdue_report(
    threshold_days: Optional[int] = Query(15, ge=1, le=180, description="Minimum days past credit term to consider overdue"),
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[OverdueReportResponse]:
    """
    Generate recovery / aging report for customers with overdue credit balances.
    Uses Asia/Karachi operational timezone.
    """
    report = ledger_service.generate_overdue_report(threshold_days=threshold_days)
    return APIResponse(data=report)


@router.get("/summary", response_model=APIResponse[PumpFinancialSummary])
def get_financial_summary(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[PumpFinancialSummary]:
    """
    Retrieve pump-wide financial summary: total outstanding receivables, customer count, and pending receipts.
    """
    summary = ledger_service.calculate_pump_summary()
    return APIResponse(data=summary)
