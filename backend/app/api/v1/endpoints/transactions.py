"""
Transaction Endpoints for Gujjar Petrolium Kot Gujjran.
Staff can enter permitted sales/payments.
Manager approval strictly required for financial adjustments/corrections.
Idempotency keys prevent duplicate entries.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.core.constants import TransactionType, TransactionStatus, UserRole
from app.core.security import require_staff_or_manager, require_authenticated, get_current_user
from app.schemas.transaction import Transaction, TransactionCreate
from app.schemas.common import APIResponse
from app.services.ledger_service import ledger_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=APIResponse[List[Transaction]])
def list_transactions(
    customer_id: Optional[str] = Query(None, description="Filter by Customer ID"),
    type: Optional[TransactionType] = Query(None, description="Filter by type (CREDIT_SALE, PAYMENT, ADJUSTMENT)"),
    status: Optional[TransactionStatus] = Query(None, description="Filter by status (PENDING, APPROVED, REJECTED)"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[List[Transaction]]:
    """List ledger transactions with optional multi-criteria filters."""
    txns = ledger_service.list_transactions(
        customer_id=customer_id,
        transaction_type=type,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    return APIResponse(data=txns)


@router.post("", response_model=APIResponse[Transaction], status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    acting_user: dict = Depends(require_staff_or_manager),
) -> APIResponse[Transaction]:
    """
    Record a new transaction:
    - CREDIT_SALE / PAYMENT: Allowed for STAFF and MANAGER.
    - ADJUSTMENT (financial correction): Strictly requires MANAGER role.
    Protects against duplicate entries via idempotency_key.
    """
    user_role = acting_user.get("role")
    role_val = user_role.value if hasattr(user_role, "value") else str(user_role)

    # Manager role required for financial corrections / adjustments
    if payload.type == TransactionType.ADJUSTMENT and role_val != UserRole.MANAGER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the Manager (Muhammad Asad) can perform financial adjustments or corrections.",
        )

    try:
        created = ledger_service.create_transaction(
            payload,
            actor_name=acting_user.get("name", "Staff"),
            actor_role=role_val,
        )
        return APIResponse(
            message="Transaction recorded successfully",
            message_ur="لین دین کامیابی سے درج کر لیا گیا",
            data=created,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
