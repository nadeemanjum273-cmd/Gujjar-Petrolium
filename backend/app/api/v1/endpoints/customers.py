"""
Customer & Ledger Endpoints for Gujjar Petrolium Kot Gujjran.
Protected by Role-Based Access Control (RBAC).
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.core.constants import CustomerStatus
from app.core.security import require_manager, require_authenticated
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.schemas.ledger import CustomerLedgerResponse
from app.schemas.common import APIResponse
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=APIResponse[List[Customer]])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, Urdu name, phone, or vehicle plate"),
    status: Optional[CustomerStatus] = Query(None, description="Filter by status: ACTIVE, INACTIVE, BLOCKED"),
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[List[Customer]]:
    """List all registered customers with search and filter capabilities."""
    customers = customer_service.list_customers(search=search, status=status)
    return APIResponse(data=customers)


@router.get("/{customer_id}", response_model=APIResponse[Customer])
def get_customer(
    customer_id: str,
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[Customer]:
    """Retrieve a single customer by unique ID."""
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID '{customer_id}' was not found.",
        )
    return APIResponse(data=customer)


@router.get("/{customer_id}/ledger", response_model=APIResponse[CustomerLedgerResponse])
def get_customer_ledger(
    customer_id: str,
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[CustomerLedgerResponse]:
    """
    Retrieve authoritative financial statement and running ledger for a customer.
    Includes all approved credit sales, payments, running balances, and overdue status.
    """
    try:
        ledger = ledger_service.calculate_customer_ledger(customer_id)
        return APIResponse(data=ledger)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=APIResponse[Customer], status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    manager: dict = Depends(require_manager),
) -> APIResponse[Customer]:
    """
    Register a new customer with initial credit limit and validated Pakistani phone number.
    Requires MANAGER role (Muhammad Asad).
    """
    try:
        created = customer_service.create_customer(payload, actor_name=manager.get("name", "Muhammad Asad"))
        return APIResponse(
            message="Customer registered successfully",
            message_ur="گاہک کامیابی کے ساتھ رجسٹر ہو گیا",
            data=created,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{customer_id}", response_model=APIResponse[Customer])
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    manager: dict = Depends(require_manager),
) -> APIResponse[Customer]:
    """
    Update permitted non-financial profile fields.
    Requires MANAGER role (Muhammad Asad).
    """
    try:
        updated = customer_service.update_customer_profile(customer_id, payload, actor_name=manager.get("name", "Muhammad Asad"))
        return APIResponse(
            message="Customer profile updated successfully",
            message_ur="گاہک کا ریکارڈ کامیابی سے اپڈیٹ ہو گیا",
            data=updated,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{customer_id}/deactivate", response_model=APIResponse[Customer])
def deactivate_customer(
    customer_id: str,
    reason: Optional[str] = Query(None, description="Reason for deactivation"),
    manager: dict = Depends(require_manager),
) -> APIResponse[Customer]:
    """
    Deactivate a customer without deleting historical ledger records.
    Requires MANAGER role (Muhammad Asad).
    """
    try:
        deactivated = customer_service.deactivate_customer(customer_id, reason=reason, actor_name=manager.get("name", "Muhammad Asad"))
        return APIResponse(
            message="Customer deactivated successfully",
            message_ur="گاہک کو غیر فعال کر دیا گیا (کھاتہ محفوظ ہے)",
            data=deactivated,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
