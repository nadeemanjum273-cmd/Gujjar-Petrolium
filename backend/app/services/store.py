"""
In-Memory Store and Mock Repository for Phase 1.
Provides seed data, duplicate ID checking, and state retention for API contracts.
In Phase 2, this will be integrated with the Google Sheets API adapter.
"""

from typing import Dict, List, Optional
from copy import deepcopy
from app.schemas.customer import Customer, CustomerCreate
from app.schemas.transaction import Transaction, TransactionCreate
from app.schemas.receipt import ReceiptQueue, ReceiptCreate, ReceiptVerification
from app.schemas.reminder import ReminderLog, ReminderCreate
from app.schemas.settings import SystemSettings, SystemSettingsUpdate
from app.schemas.audit import AuditLog, AuditLogCreate
from app.core.constants import TransactionStatus, ReceiptStatus, AuditAction
from app.services.sample_data import (
    SAMPLE_CUSTOMERS,
    SAMPLE_TRANSACTIONS,
    SAMPLE_RECEIPTS,
    SAMPLE_REMINDERS,
    SAMPLE_SETTINGS,
    SAMPLE_AUDIT_LOGS,
)


class InMemoryStore:
    def __init__(self):
        self.reset()

    def reset(self):
        """Reset repository to initial synthetic sample data."""
        self.customers: Dict[str, Customer] = {c.id: deepcopy(c) for c in SAMPLE_CUSTOMERS}
        self.transactions: Dict[str, Transaction] = {t.id: deepcopy(t) for t in SAMPLE_TRANSACTIONS}
        self.receipts: Dict[str, ReceiptQueue] = {r.id: deepcopy(r) for r in SAMPLE_RECEIPTS}
        self.reminders: Dict[str, ReminderLog] = {r.id: deepcopy(r) for r in SAMPLE_REMINDERS}
        self.settings: SystemSettings = deepcopy(SAMPLE_SETTINGS)
        self.audit_logs: List[AuditLog] = deepcopy(SAMPLE_AUDIT_LOGS)
        self.idempotency_keys: Dict[str, str] = {}  # idempotency_key -> transaction_id

    # --------------------------------------------------------------------------
    # CUSTOMERS
    # --------------------------------------------------------------------------
    def get_customers(self) -> List[Customer]:
        return list(self.customers.values())

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        return self.customers.get(customer_id)

    def create_customer(self, data: CustomerCreate) -> Customer:
        cust_id = data.id
        if not cust_id:
            # Auto-generate next CUST-XXX
            existing_nums = [
                int(c.id.split("-")[1])
                for c in self.customers.values()
                if c.id.startswith("CUST-") and c.id.split("-")[1].isdigit()
            ]
            next_num = max(existing_nums, default=0) + 1
            cust_id = f"CUST-{next_num:03d}"

        if cust_id in self.customers:
            raise ValueError(f"Duplicate Customer ID '{cust_id}' already exists.")

        new_customer = Customer(
            id=cust_id,
            name=data.name,
            name_ur=data.name_ur,
            phone=data.phone,
            status=data.status,
            credit_limit=data.credit_limit,
            opening_balance=data.opening_balance,
            current_balance=data.opening_balance,
            vehicle_numbers=data.vehicle_numbers,
            address=data.address,
            notes=data.notes,
        )
        self.customers[cust_id] = new_customer
        return new_customer

    # --------------------------------------------------------------------------
    # TRANSACTIONS
    # --------------------------------------------------------------------------
    def get_transactions(self, customer_id: Optional[str] = None) -> List[Transaction]:
        txns = list(self.transactions.values())
        if customer_id:
            txns = [t for t in txns if t.customer_id == customer_id]
        return txns

    def get_transaction(self, txn_id: str) -> Optional[Transaction]:
        return self.transactions.get(txn_id)

    def create_transaction(self, data: TransactionCreate) -> Transaction:
        # Validate customer exists
        if data.customer_id not in self.customers:
            raise ValueError(f"Customer '{data.customer_id}' does not exist.")

        # Check idempotency
        if data.idempotency_key:
            if data.idempotency_key in self.idempotency_keys:
                existing_id = self.idempotency_keys[data.idempotency_key]
                return self.transactions[existing_id]

        # Generate unique transaction ID
        existing_nums = [
            int(t.id.split("-")[1])
            for t in self.transactions.values()
            if t.id.startswith("TXN-") and t.id.split("-")[1].isdigit()
        ]
        next_num = max(existing_nums, default=0) + 1
        txn_id = f"TXN-{next_num:05d}"

        new_txn = Transaction(
            id=txn_id,
            customer_id=data.customer_id,
            type=data.type,
            amount=data.amount,
            description=data.description,
            transaction_date=data.transaction_date,
            fuel_type=data.fuel_type,
            liters=data.liters,
            rate_per_liter=data.rate_per_liter,
            vehicle_number=data.vehicle_number,
            slip_number=data.slip_number,
            adjustment_direction=data.adjustment_direction,
            status=TransactionStatus.PENDING,
            idempotency_key=data.idempotency_key,
            created_by=data.created_by,
        )
        self.transactions[txn_id] = new_txn
        if data.idempotency_key:
            self.idempotency_keys[data.idempotency_key] = txn_id
        return new_txn

    # --------------------------------------------------------------------------
    # RECEIPTS
    # --------------------------------------------------------------------------
    def get_receipts(self) -> List[ReceiptQueue]:
        return list(self.receipts.values())

    def get_receipt(self, receipt_id: str) -> Optional[ReceiptQueue]:
        return self.receipts.get(receipt_id)

    def create_receipt(self, data: ReceiptCreate) -> ReceiptQueue:
        if data.customer_id not in self.customers:
            raise ValueError(f"Customer '{data.customer_id}' does not exist.")

        rcpt_id = data.id
        if not rcpt_id:
            existing_nums = [
                int(r.id.split("-")[1])
                for r in self.receipts.values()
                if r.id.startswith("RCPT-") and r.id.split("-")[1].isdigit()
            ]
            next_num = max(existing_nums, default=0) + 1
            rcpt_id = f"RCPT-{next_num:03d}"

        if rcpt_id in self.receipts:
            raise ValueError(f"Duplicate Receipt ID '{rcpt_id}' already exists.")

        new_receipt = ReceiptQueue(
            id=rcpt_id,
            customer_id=data.customer_id,
            claimed_amount=data.claimed_amount,
            payment_date=data.payment_date,
            channel=data.channel,
            transaction_reference=data.transaction_reference,
            receipt_image_url=data.receipt_image_url,
            notes=data.notes,
            status=ReceiptStatus.PENDING_VERIFICATION,
        )
        self.receipts[rcpt_id] = new_receipt
        return new_receipt

    # --------------------------------------------------------------------------
    # REMINDERS
    # --------------------------------------------------------------------------
    def get_reminders(self) -> List[ReminderLog]:
        return list(self.reminders.values())

    def create_reminder(self, data: ReminderCreate) -> ReminderLog:
        if data.customer_id not in self.customers:
            raise ValueError(f"Customer '{data.customer_id}' does not exist.")

        rem_id = data.id
        if not rem_id:
            existing_nums = [
                int(r.id.split("-")[1])
                for r in self.reminders.values()
                if r.id.startswith("REM-") and r.id.split("-")[1].isdigit()
            ]
            next_num = max(existing_nums, default=0) + 1
            rem_id = f"REM-{next_num:03d}"

        new_reminder = ReminderLog(
            id=rem_id,
            customer_id=data.customer_id,
            phone=data.phone,
            reminder_type=data.reminder_type,
            amount_due=data.amount_due,
            message_text=data.message_text,
            message_text_ur=data.message_text_ur,
            dry_run=data.dry_run,
        )
        self.reminders[rem_id] = new_reminder
        return new_reminder

    # --------------------------------------------------------------------------
    # SETTINGS
    # --------------------------------------------------------------------------
    def get_settings(self) -> SystemSettings:
        return self.settings

    def update_settings(self, update: SystemSettingsUpdate) -> SystemSettings:
        data = update.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(self.settings, key, value)
        return self.settings

    # --------------------------------------------------------------------------
    # AUDIT LOGS
    # --------------------------------------------------------------------------
    def get_audit_logs(self) -> List[AuditLog]:
        return sorted(self.audit_logs, key=lambda a: a.timestamp, reverse=True)

    def log_action(self, entry: AuditLogCreate) -> AuditLog:
        aud_id = entry.id or f"AUD-{len(self.audit_logs)+1:04d}"
        log = AuditLog(
            id=aud_id,
            actor_name=entry.actor_name,
            actor_role=entry.actor_role,
            action=entry.action,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            details=entry.details,
            details_ur=entry.details_ur,
            metadata=entry.metadata,
            ip_address=entry.ip_address,
        )
        self.audit_logs.append(log)
        return log


# Global store instance
store = InMemoryStore()
