"""
Customer Schema for Gujjar Petrolium Kot Gujjran.
Defines customer profile, credit limits, phone verification, and ledger status.
"""

from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.core.constants import CustomerStatus
from app.schemas.common import normalize_pakistani_phone, validate_money_decimal


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full customer or business name")
    name_ur: Optional[str] = Field(None, max_length=100, description="Customer name in Urdu script")
    phone: str = Field(..., description="Pakistani mobile number (+923XXXXXXXXX)")
    status: CustomerStatus = Field(default=CustomerStatus.ACTIVE, description="Customer account status")
    credit_limit: Decimal = Field(default=Decimal("50000.00"), description="Maximum allowable credit balance in PKR")
    opening_balance: Decimal = Field(default=Decimal("0.00"), description="Initial opening balance at migration in PKR")
    vehicle_numbers: Optional[List[str]] = Field(default_factory=list, description="Authorized vehicle or tractor plates")
    address: Optional[str] = Field(None, max_length=250, description="Village or physical address (Kot Gujjran)")
    notes: Optional[str] = Field(None, max_length=500, description="Manager operational notes")
    whatsapp_consent: bool = Field(default=True, description="Customer has agreed to receive WhatsApp notifications")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_pakistani_phone(v)

    @field_validator("credit_limit", "opening_balance", mode="before")
    @classmethod
    def validate_amounts(cls, v: Decimal) -> Decimal:
        return validate_money_decimal(v, allow_zero=True)


class CustomerCreate(CustomerBase):
    id: Optional[str] = Field(None, description="Optional custom customer identifier (e.g. CUST-001)")


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    name_ur: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = None
    status: Optional[CustomerStatus] = None
    credit_limit: Optional[Decimal] = None
    vehicle_numbers: Optional[List[str]] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    whatsapp_consent: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return normalize_pakistani_phone(v)
        return v

    @field_validator("credit_limit", mode="before")
    @classmethod
    def validate_amounts(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_money_decimal(v, allow_zero=True)
        return v


class Customer(CustomerBase):
    id: str = Field(..., description="Unique customer ID (e.g. CUST-001)")
    current_balance: Decimal = Field(default=Decimal("0.00"), description="Authoritative outstanding debit balance in PKR")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    @field_validator("current_balance", mode="before")
    @classmethod
    def validate_balance(cls, v: Decimal) -> Decimal:
        return validate_money_decimal(v, allow_zero=True)
