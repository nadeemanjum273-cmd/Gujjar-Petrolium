"""
Transaction Schema for Gujjar Petrolium Kot Gujjran.
Enforces positive Decimal money amounts, petrol pump fuel metering, and debit/credit consistency.
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator
from app.core.constants import TransactionStatus, TransactionType
from app.schemas.common import validate_money_decimal


class AdjustmentDirection(str, Enum):
    DEBIT = "DEBIT"    # Increases customer balance (debt owed to pump)
    CREDIT = "CREDIT"  # Decreases customer balance (payment/credit relief)


class TransactionBase(BaseModel):
    customer_id: str = Field(..., min_length=3, max_length=50, description="Target customer identifier (e.g. CUST-001)")
    type: TransactionType = Field(..., description="CREDIT_SALE (debit), PAYMENT (credit), or ADJUSTMENT")
    amount: Decimal = Field(..., description="Monetary value in PKR (strictly positive)")
    description: str = Field(..., min_length=2, max_length=250, description="Description or fuel slip memo")
    transaction_date: datetime = Field(default_factory=datetime.utcnow, description="Date and time transaction took place")

    # Petrol pump specific context
    fuel_type: Optional[str] = Field(None, description="e.g. Diesel (ڈیزل), Super (پیٹرول), Engine Oil (موبل آئل)")
    liters: Optional[Decimal] = Field(None, description="Quantity dispensed in liters")
    rate_per_liter: Optional[Decimal] = Field(None, description="Price per liter in PKR")
    vehicle_number: Optional[str] = Field(None, max_length=50, description="Vehicle or tractor registration number")
    slip_number: Optional[str] = Field(None, max_length=50, description="Physical paper dispenser slip number")
    
    # For adjustments only
    adjustment_direction: Optional[AdjustmentDirection] = Field(
        None, description="Required for ADJUSTMENT type: DEBIT increases debt, CREDIT reduces debt"
    )

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        return validate_money_decimal(v, allow_zero=False)

    @field_validator("liters", "rate_per_liter", mode="before")
    @classmethod
    def validate_positives(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_money_decimal(v, allow_zero=False)
        return v

    @model_validator(mode="after")
    def validate_type_consistency(self) -> "TransactionBase":
        # Validate fuel rate calculation if both liters and rate_per_liter are provided
        if self.liters is not None and self.rate_per_liter is not None:
            expected_amount = (self.liters * self.rate_per_liter).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            # Allow minor rounding discrepancy up to 1 PKR due to dispenser penny rounding
            if abs(self.amount - expected_amount) > Decimal("1.00"):
                raise ValueError(
                    f"Transaction amount ({self.amount}) does not match liters ({self.liters}) * rate ({self.rate_per_liter}) = {expected_amount}"
                )

        # Validate adjustment direction
        if self.type == TransactionType.ADJUSTMENT and self.adjustment_direction is None:
            raise ValueError("Adjustment transactions must specify an adjustment_direction (DEBIT or CREDIT)")

        return self


class TransactionCreate(TransactionBase):
    idempotency_key: Optional[str] = Field(
        None, max_length=100, description="Unique client-provided key to prevent duplicate submissions"
    )
    created_by: str = Field(default="Muhammad Asad", description="Manager or operator initiating the transaction")


class Transaction(TransactionBase):
    id: str = Field(..., description="Authoritative unique transaction ID (e.g. TXN-00001)")
    status: TransactionStatus = Field(default=TransactionStatus.PENDING, description="PENDING, APPROVED, or REJECTED")
    idempotency_key: Optional[str] = None
    created_by: str = Field(default="Muhammad Asad")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    @property
    def is_debit(self) -> bool:
        """Returns True if this transaction increases the customer's debt (customer owes money to pump)."""
        if self.type == TransactionType.CREDIT_SALE:
            return True
        if self.type == TransactionType.PAYMENT:
            return False
        if self.type == TransactionType.ADJUSTMENT:
            return self.adjustment_direction == AdjustmentDirection.DEBIT
        return False

    @property
    def is_credit(self) -> bool:
        """Returns True if this transaction decreases the customer's debt (payment received or credit relief)."""
        return not self.is_debit
