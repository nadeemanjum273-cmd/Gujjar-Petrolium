"""
Ledger and Financial Report Schemas for Gujjar Petrolium Kot Gujjran.
Defines authoritative running balances, customer statements, and aging/overdue reports.
"""

from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.constants import TransactionStatus, TransactionType, CustomerStatus
from app.schemas.customer import Customer


class LedgerEntry(BaseModel):
    transaction_id: str
    transaction_date: datetime
    type: TransactionType
    description: str
    fuel_type: Optional[str] = None
    liters: Optional[Decimal] = None
    rate_per_liter: Optional[Decimal] = None
    vehicle_number: Optional[str] = None
    slip_number: Optional[str] = None
    status: TransactionStatus
    debit_amount: Decimal = Field(default=Decimal("0.00"), description="Debit to customer (Fuel taken on credit)")
    credit_amount: Decimal = Field(default=Decimal("0.00"), description="Credit to customer (Payment received)")
    running_balance: Decimal = Field(..., description="Authoritative running balance after this transaction (approved only)")
    is_approved: bool


class CustomerLedgerResponse(BaseModel):
    customer: Customer
    ledger_entries: List[LedgerEntry]
    total_approved_debits: Decimal = Field(..., description="Sum of all approved credit fuel sales")
    total_approved_credits: Decimal = Field(..., description="Sum of all approved payments & credit adjustments")
    outstanding_balance: Decimal = Field(..., description="Authoritative outstanding debt (Debits - Credits)")
    credit_limit: Decimal
    available_credit: Decimal
    pending_payments_count: int
    pending_payments_amount: Decimal
    is_overdue: bool
    oldest_unpaid_date: Optional[datetime] = None
    days_overdue: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def current_balance(self) -> Decimal:
        return self.outstanding_balance


class OverdueReportItem(BaseModel):
    customer_id: str
    customer_name: str
    customer_name_ur: Optional[str] = None
    phone: str
    status: CustomerStatus
    credit_limit: Decimal
    outstanding_balance: Decimal
    days_overdue: int
    oldest_unpaid_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    whatsapp_consent: bool


class OverdueReportResponse(BaseModel):
    total_overdue_amount: Decimal
    total_overdue_customers: int
    threshold_days: int
    customers: List[OverdueReportItem]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class PumpFinancialSummary(BaseModel):
    total_receivables: Decimal = Field(..., description="Sum of all customer balances currently owed to pump")
    total_active_customers: int
    total_overdue_customers: int
    total_pending_receipts_amount: Decimal
    generated_at: datetime = Field(default_factory=datetime.utcnow)
