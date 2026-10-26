"""
Receipt Queue Schema for Gujjar Petrolium Kot Gujjran.
Enforces the core rule: Every receipt is an unverified payment claim until independently verified.
"""

from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.core.constants import ReceiptStatus
from app.schemas.common import validate_money_decimal


class ReceiptBase(BaseModel):
    customer_id: str = Field(..., min_length=3, max_length=50, description="Customer submitting payment claim")
    claimed_amount: Decimal = Field(..., description="Claimed transfer amount in PKR")
    payment_date: datetime = Field(default_factory=datetime.utcnow, description="Date money was allegedly transferred")
    channel: Optional[str] = Field(None, max_length=100, description="Bank or payment method (e.g. Meezan, HBL, JazzCash, Cash)")
    transaction_reference: Optional[str] = Field(None, max_length=100, description="Bank transfer reference / TID / Cheque No.")
    receipt_image_url: Optional[str] = Field(None, description="URL or storage reference to uploaded receipt image")
    notes: Optional[str] = Field(None, max_length=500, description="Customer or operator submission notes")

    @field_validator("claimed_amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        return validate_money_decimal(v, allow_zero=False)


class ReceiptCreate(ReceiptBase):
    id: Optional[str] = None


class ReceiptVerification(BaseModel):
    status: ReceiptStatus = Field(..., description="Must be APPROVED or REJECTED")
    verified_by: str = Field(default="Muhammad Asad", description="Authorized manager performing verification")
    verification_notes: Optional[str] = Field(None, max_length=500, description="Bank statement confirmation or reason")
    rejection_reason: Optional[str] = Field(None, max_length=250)


class ReceiptQueue(ReceiptBase):
    id: str = Field(..., description="Unique receipt claim ID (e.g. RCPT-001)")
    status: ReceiptStatus = Field(
        default=ReceiptStatus.PENDING_VERIFICATION,
        description="PENDING_VERIFICATION until manager approves with bank statement"
    )
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    resulting_transaction_id: Optional[str] = Field(
        None, description="Linked approved PAYMENT transaction ID once verified"
    )
