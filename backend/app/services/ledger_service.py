"""
Ledger and Transaction Engine for Gujjar Petrolium Kot Gujjran.
Authoritative source for all financial balances, credit sales, payment recordings,
running balance ledger statements, and aging/overdue reports.
"""

from typing import List, Optional, Tuple, Dict
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import dateutil.parser

from app.core.config import settings
from app.core.constants import (
    CustomerStatus,
    TransactionStatus,
    TransactionType,
    AuditAction,
)
from app.schemas.transaction import Transaction, TransactionCreate, AdjustmentDirection
from app.schemas.ledger import (
    LedgerEntry,
    CustomerLedgerResponse,
    OverdueReportItem,
    OverdueReportResponse,
    PumpFinancialSummary,
)
from app.services.sheets import sheets_service, parse_sheet_amount
from app.services.customer_service import customer_service


def _row_to_transaction(row: dict) -> Transaction:
    """Converts a raw Google Sheets transaction row into a validated Transaction model."""
    txn_date_str = str(row.get("transaction_date", ""))
    try:
        txn_date = dateutil.parser.parse(txn_date_str) if txn_date_str else datetime.utcnow()
        if txn_date.tzinfo is not None:
            txn_date = txn_date.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception:
        txn_date = datetime.utcnow()

    created_at_str = str(row.get("created_at", ""))
    try:
        created_at = dateutil.parser.parse(created_at_str) if created_at_str else datetime.utcnow()
        if created_at.tzinfo is not None:
            created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception:
        created_at = datetime.utcnow()

    type_str = str(row.get("type", "CREDIT_SALE")).strip().upper()
    txn_type = TransactionType(type_str) if type_str in ["CREDIT_SALE", "PAYMENT", "ADJUSTMENT"] else TransactionType.CREDIT_SALE

    # Calculate amount from debit/credit or amount column
    debit_val = parse_sheet_amount(row.get("debit"))
    credit_val = parse_sheet_amount(row.get("credit"))
    raw_amount = parse_sheet_amount(row.get("amount"))

    adj_dir_str = str(row.get("adjustment_direction", "")).strip().upper()
    adj_dir = AdjustmentDirection(adj_dir_str) if adj_dir_str in ["DEBIT", "CREDIT"] else None

    if txn_type == TransactionType.CREDIT_SALE:
        amount = debit_val if debit_val > Decimal("0.00") else raw_amount
    elif txn_type == TransactionType.PAYMENT:
        amount = credit_val if credit_val > Decimal("0.00") else raw_amount
    elif txn_type == TransactionType.ADJUSTMENT:
        if credit_val > Decimal("0.00"):
            amount = credit_val
            adj_dir = AdjustmentDirection.CREDIT
        elif debit_val > Decimal("0.00"):
            amount = debit_val
            adj_dir = AdjustmentDirection.DEBIT
        else:
            amount = raw_amount
            if not adj_dir:
                adj_dir = AdjustmentDirection.CREDIT
    else:
        amount = raw_amount

    # Ensure amount is strictly positive for model validation (if 0 in sheet, default to 0.01 or handle)
    if amount <= Decimal("0.00"):
        amount = Decimal("0.01")

    liters_val = parse_sheet_amount(row.get("liters"))
    rate_val = parse_sheet_amount(row.get("rate_per_liter"))

    status_str = str(row.get("status", "PENDING")).strip().upper()
    status = TransactionStatus(status_str) if status_str in ["PENDING", "APPROVED", "REJECTED"] else TransactionStatus.PENDING

    return Transaction(
        id=str(row.get("id", "")).strip(),
        customer_id=str(row.get("customer_id", "")).strip(),
        type=txn_type,
        amount=amount,
        description=str(row.get("description", "")).strip() or "Transaction",
        transaction_date=txn_date,
        fuel_type=str(row.get("fuel_type", "")).strip() or None,
        liters=liters_val if liters_val > Decimal("0.00") else None,
        rate_per_liter=rate_val if rate_val > Decimal("0.00") else None,
        vehicle_number=str(row.get("vehicle_number", "")).strip() or None,
        slip_number=str(row.get("slip_number", "")).strip() or None,
        adjustment_direction=adj_dir,
        status=status,
        idempotency_key=str(row.get("idempotency_key", "")).strip() or None,
        created_by=str(row.get("created_by", "Muhammad Asad")).strip(),
        created_at=created_at,
        approved_by=str(row.get("approved_by", "")).strip() or None,
        approved_at=None,
    )


class LedgerService:
    def __init__(self):
        self._karachi_tz = ZoneInfo("Asia/Karachi")

    def list_transactions(
        self,
        customer_id: Optional[str] = None,
        transaction_type: Optional[TransactionType] = None,
        status: Optional[TransactionStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Transaction]:
        """
        Retrieves transactions from Google Sheets with multi-criteria filtering.
        """
        rows = sheets_service.read_records("Transactions")
        txns = [_row_to_transaction(r) for r in rows if r.get("id")]

        if customer_id:
            txns = [t for t in txns if t.customer_id == customer_id.strip()]

        if transaction_type:
            txns = [t for t in txns if t.type == transaction_type]

        if status:
            txns = [t for t in txns if t.status == status]

        if start_date:
            txns = [t for t in txns if t.transaction_date >= start_date]

        if end_date:
            txns = [t for t in txns if t.transaction_date <= end_date]

        # Chronological sort
        txns.sort(key=lambda x: x.transaction_date)
        return txns

    def create_transaction(
        self,
        data: TransactionCreate,
        actor_name: str = "Muhammad Asad",
        actor_role: str = "MANAGER",
    ) -> Transaction:
        """
        Records a transaction (CREDIT_SALE, PAYMENT, or ADJUSTMENT).
        Enforces:
        - Customer existence check
        - Idempotency key deduplication
        - Append-only recording in Google Sheets
        - Authoritative balance recalculation and updating in Customers tab
        """
        customer = customer_service.get_customer(data.customer_id)
        if not customer:
            raise ValueError(f"Target customer '{data.customer_id}' does not exist.")

        # Check customer status: Blocked customers cannot take new credit sales
        if customer.status == CustomerStatus.BLOCKED and data.type == TransactionType.CREDIT_SALE:
            raise ValueError(
                f"Customer '{customer.name}' ({customer.id}) is BLOCKED. New credit sales are prohibited."
            )

        # Idempotency check
        existing_txns = self.list_transactions()
        if data.idempotency_key:
            for t in existing_txns:
                if t.idempotency_key == data.idempotency_key:
                    return t

        # Generate unique transaction ID
        existing_nums = [
            int(t.id.split("-")[1])
            for t in existing_txns
            if t.id.startswith("TXN-") and t.id.split("-")[1].isdigit()
        ]
        next_num = max(existing_nums, default=0) + 1
        txn_id = f"TXN-{next_num:05d}"

        # Status determination: Manager entries are APPROVED immediately; operator entries may be PENDING
        initial_status = TransactionStatus.APPROVED if actor_role == "MANAGER" else TransactionStatus.PENDING
        approved_by = actor_name if initial_status == TransactionStatus.APPROVED else None

        now = datetime.utcnow()
        new_txn = Transaction(
            id=txn_id,
            customer_id=data.customer_id,
            type=data.type,
            amount=data.amount,
            description=data.description,
            transaction_date=data.transaction_date or now,
            fuel_type=data.fuel_type,
            liters=data.liters,
            rate_per_liter=data.rate_per_liter,
            vehicle_number=data.vehicle_number,
            slip_number=data.slip_number,
            adjustment_direction=data.adjustment_direction,
            status=initial_status,
            idempotency_key=data.idempotency_key,
            created_by=actor_name,
            created_at=now,
            approved_by=approved_by,
        )

        # Prepare Google Sheets record
        sheet_record = {
            "id": new_txn.id,
            "customer_id": new_txn.customer_id,
            "type": new_txn.type.value,
            "amount": str(new_txn.amount),
            "description": new_txn.description,
            "transaction_date": new_txn.transaction_date.isoformat(),
            "fuel_type": new_txn.fuel_type or "",
            "liters": str(new_txn.liters) if new_txn.liters else "",
            "rate_per_liter": str(new_txn.rate_per_liter) if new_txn.rate_per_liter else "",
            "vehicle_number": new_txn.vehicle_number or "",
            "slip_number": new_txn.slip_number or "",
            "adjustment_direction": new_txn.adjustment_direction.value if new_txn.adjustment_direction else "",
            "status": new_txn.status.value,
            "idempotency_key": new_txn.idempotency_key or "",
            "created_by": new_txn.created_by,
            "approved_by": new_txn.approved_by or "",
            "created_at": new_txn.created_at.isoformat(),
        }
        sheets_service.append_record("Transactions", sheet_record)

        # Audit log
        sheets_service.append_record("AuditLog", {
            "id": f"AUD-{now.strftime('%Y%m%d%H%M%S')}",
            "timestamp": now.isoformat(),
            "actor_name": actor_name,
            "actor_role": actor_role,
            "action": AuditAction.CREATE.value,
            "entity_type": "TRANSACTION",
            "entity_id": new_txn.id,
            "details": f"Recorded {new_txn.type.value} of PKR {new_txn.amount} for {customer.name} (Status: {new_txn.status.value})",
            "details_ur": f"{customer.name} کیلئے {new_txn.amount} روپے کا {new_txn.type.value} درج کیا گیا",
        })

        # Recalculate customer's authoritative balance in Customers tab
        self._sync_customer_balance(customer.id)

        return new_txn

    def _sync_customer_balance(self, customer_id: str) -> Decimal:
        """
        Recalculates the authoritative balance and persists it to the Customers sheet tab.
        """
        ledger_res = self.calculate_customer_ledger(customer_id)
        new_balance = ledger_res.outstanding_balance
        sheets_service.update_cell_by_id("Customers", customer_id, "current_balance", str(new_balance))
        return new_balance

    def get_customer_ledger(self, customer_id: str) -> CustomerLedgerResponse:
        """Alias for calculate_customer_ledger."""
        return self.calculate_customer_ledger(customer_id)

    def calculate_customer_ledger(self, customer_id: str) -> CustomerLedgerResponse:
        """
        Computes the complete authoritative financial statement for a customer.
        Rules:
        - Balance = Sum(Approved Debits) - Sum(Approved Credits)
        - Pending or rejected transactions NEVER affect running or final balance.
        - Running balance is calculated chronologically line-by-line.
        - Calculates overdue status against pump threshold days.
        """
        customer = customer_service.get_customer(customer_id)
        if not customer:
            raise ValueError(f"Customer '{customer_id}' was not found.")

        txns = self.list_transactions(customer_id=customer_id)

        total_approved_debits = Decimal("0.00")
        total_approved_credits = Decimal("0.00")
        running_balance = Decimal("0.00")

        pending_payments_count = 0
        pending_payments_amount = Decimal("0.00")

        ledger_entries: List[LedgerEntry] = []
        oldest_unsettled_date: Optional[datetime] = None

        for t in txns:
            is_approved = t.status == TransactionStatus.APPROVED
            debit_amt = Decimal("0.00")
            credit_amt = Decimal("0.00")

            if t.is_debit:
                debit_amt = t.amount
                if is_approved:
                    total_approved_debits += t.amount
                    running_balance += t.amount
            else:
                credit_amt = t.amount
                if is_approved:
                    total_approved_credits += t.amount
                    running_balance -= t.amount
                elif t.type == TransactionType.PAYMENT and t.status == TransactionStatus.PENDING:
                    pending_payments_count += 1
                    pending_payments_amount += t.amount

            # If balance just became positive after being zero, mark oldest date
            if running_balance > Decimal("0.00") and oldest_unsettled_date is None:
                oldest_unsettled_date = t.transaction_date

            # If balance fully cleared, reset oldest date
            if running_balance <= Decimal("0.00"):
                oldest_unsettled_date = None

            ledger_entries.append(
                LedgerEntry(
                    transaction_id=t.id,
                    transaction_date=t.transaction_date,
                    type=t.type,
                    description=t.description,
                    fuel_type=t.fuel_type,
                    liters=t.liters,
                    rate_per_liter=t.rate_per_liter,
                    vehicle_number=t.vehicle_number,
                    slip_number=t.slip_number,
                    status=t.status,
                    debit_amount=debit_amt,
                    credit_amount=credit_amt,
                    running_balance=running_balance,
                    is_approved=is_approved,
                )
            )

        # Authoritative Outstanding Balance
        outstanding_balance = total_approved_debits - total_approved_credits
        if outstanding_balance < Decimal("0.00"):
            # Customer has overpaid / advance credit balance
            outstanding_balance = Decimal("0.00")

        available_credit = customer.credit_limit - outstanding_balance
        if available_credit < Decimal("0.00"):
            available_credit = Decimal("0.00")

        # Overdue Calculation (Karachi Timezone)
        now_karachi = datetime.now(self._karachi_tz)
        days_overdue = 0
        is_overdue = False

        if outstanding_balance > Decimal("0.00") and oldest_unsettled_date:
            unsettled_dt = (
                oldest_unsettled_date.replace(tzinfo=timezone.utc).astimezone(self._karachi_tz)
                if oldest_unsettled_date.tzinfo is None
                else oldest_unsettled_date.astimezone(self._karachi_tz)
            )
            delta = now_karachi - unsettled_dt
            days_overdue = max(0, delta.days)
            if days_overdue >= settings.overdue_threshold_days if hasattr(settings, 'overdue_threshold_days') else 15:
                is_overdue = True

        return CustomerLedgerResponse(
            customer=customer,
            ledger_entries=ledger_entries,
            total_approved_debits=total_approved_debits,
            total_approved_credits=total_approved_credits,
            outstanding_balance=outstanding_balance,
            credit_limit=customer.credit_limit,
            available_credit=available_credit,
            pending_payments_count=pending_payments_count,
            pending_payments_amount=pending_payments_amount,
            is_overdue=is_overdue,
            oldest_unpaid_date=oldest_unsettled_date,
            days_overdue=days_overdue,
            generated_at=datetime.utcnow(),
        )

    def calculate_pump_summary(self) -> PumpFinancialSummary:
        """
        Calculates total outstanding receivables across all customers and pending payment claims.
        """
        customers = customer_service.list_customers()
        total_receivables = Decimal("0.00")
        overdue_count = 0
        active_count = 0

        for c in customers:
            if c.status == CustomerStatus.ACTIVE:
                active_count += 1
            ledger = self.calculate_customer_ledger(c.id)
            total_receivables += ledger.outstanding_balance
            if ledger.is_overdue:
                overdue_count += 1

        # Calculate pending receipts in queue
        receipt_rows = sheets_service.read_records("ReceiptQueue")
        pending_receipts_amount = sum(
            Decimal(r.get("claimed_amount", "0.00") or "0.00")
            for r in receipt_rows
            if r.get("status") == "PENDING_VERIFICATION"
        )

        return PumpFinancialSummary(
            total_receivables=total_receivables,
            total_active_customers=active_count,
            total_overdue_customers=overdue_count,
            total_pending_receipts_amount=pending_receipts_amount,
            generated_at=datetime.utcnow(),
        )

    def generate_overdue_report(self, threshold_days: Optional[int] = None) -> OverdueReportResponse:
        """
        Generates an aging report of all customers whose unpaid credit exceeds the threshold.
        """
        thresh = threshold_days if threshold_days is not None else 15
        customers = customer_service.list_customers()
        overdue_items: List[OverdueReportItem] = []
        total_overdue_amount = Decimal("0.00")

        now_karachi = datetime.now(self._karachi_tz)

        for c in customers:
            ledger = self.calculate_customer_ledger(c.id)
            if ledger.outstanding_balance > Decimal("0.00") and ledger.days_overdue >= thresh:
                # Find last payment date
                last_payment_date: Optional[datetime] = None
                txns = self.list_transactions(customer_id=c.id, transaction_type=TransactionType.PAYMENT)
                approved_payments = [t for t in txns if t.status == TransactionStatus.APPROVED]
                if approved_payments:
                    last_payment_date = approved_payments[-1].transaction_date

                item = OverdueReportItem(
                    customer_id=c.id,
                    customer_name=c.name,
                    customer_name_ur=c.name_ur,
                    phone=c.phone,
                    status=c.status,
                    credit_limit=c.credit_limit,
                    outstanding_balance=ledger.outstanding_balance,
                    days_overdue=ledger.days_overdue,
                    oldest_unpaid_date=ledger.oldest_unpaid_date,
                    last_payment_date=last_payment_date,
                    whatsapp_consent=c.whatsapp_consent,
                )
                overdue_items.append(item)
                total_overdue_amount += ledger.outstanding_balance

        # Sort by days_overdue descending
        overdue_items.sort(key=lambda x: x.days_overdue, reverse=True)

        return OverdueReportResponse(
            total_overdue_amount=total_overdue_amount,
            total_overdue_customers=len(overdue_items),
            threshold_days=thresh,
            customers=overdue_items,
            generated_at=datetime.utcnow(),
        )


ledger_service = LedgerService()
