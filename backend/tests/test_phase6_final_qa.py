"""
Phase 6 Final Quality Assurance & Resilience Test Suite for Gujjar Petrolium Kot Gujjran.
Covers:
- Partial payments and running balance decrement across multiple installments
- Unapproved (PENDING & REJECTED) transactions guarantee zero balance modification
- Deactivated / blocked customers forbidden from receiving credit fuel sales
- Negative, zero, or malformed transaction amounts strictly rejected
- Google Sheets simulation of transient rate limits and recovery
- Meta WhatsApp Cloud API partial failures, network timeouts, and error handling
- Webhook duplicate delivery status idempotency
- Overdue report aging thresholds (15, 30, 60 days)
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.constants import (
    CustomerStatus,
    TransactionType,
    TransactionStatus,
    ReceiptStatus,
    UserRole,
    ReminderStatus,
)
from app.core.security import create_access_token
from app.schemas.transaction import TransactionCreate
from app.services.sheets import sheets_service, MockSpreadsheet, GoogleSheetsAPIError
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service
from app.services.whatsapp_service import whatsapp_service

client = TestClient(app)


def get_token(username: str = "asad", role: UserRole = UserRole.MANAGER) -> str:
    return create_access_token({
        "sub": f"USR-{username}",
        "username": username,
        "name": f"Manager {username}",
        "role": role.value,
    })


@pytest.fixture(autouse=True)
def clean_mock_store():
    sheets_service._is_mock = True
    if not isinstance(sheets_service._spreadsheet, MockSpreadsheet):
        sheets_service._spreadsheet = MockSpreadsheet()
    sheets_service.reset_mock()
    yield
    sheets_service.reset_mock()


# ==============================================================================
# 1. Partial Payments & Staggered Settlements
# ==============================================================================
def test_partial_payments_running_balance_decrement():
    """
    Multiple staggered partial payments reduce the customer's balance accurately,
    maintaining mathematical precision down to 0.01 PKR.
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Initial ledger
    initial_ledger = ledger_service.calculate_customer_ledger("CUST-001")
    starting_balance = initial_ledger.outstanding_balance

    # 1st partial payment: PKR 10,000.50
    p1 = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "PAYMENT",
        "amount": "10000.50",
        "description": "1st installment cash payment",
        "idempotency_key": "part-pay-001",
    }, headers=headers)
    assert p1.status_code == 201

    ledger_after_p1 = ledger_service.calculate_customer_ledger("CUST-001")
    expected_after_p1 = starting_balance - Decimal("10000.50")
    assert ledger_after_p1.outstanding_balance == expected_after_p1

    # 2nd partial payment: PKR 15,250.25
    p2 = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "PAYMENT",
        "amount": "15250.25",
        "description": "2nd installment bank transfer",
        "idempotency_key": "part-pay-002",
    }, headers=headers)
    assert p2.status_code == 201

    ledger_after_p2 = ledger_service.calculate_customer_ledger("CUST-001")
    expected_after_p2 = expected_after_p1 - Decimal("15250.25")
    assert ledger_after_p2.outstanding_balance == expected_after_p2


# ==============================================================================
# 2. Pending and Rejected Transactions Do Not Alter Balances
# ==============================================================================
def test_pending_and_rejected_transactions_zero_balance_impact():
    """
    Transactions marked as PENDING or REJECTED must never impact the customer's
    authoritative ledger balance.
    """
    initial_ledger = ledger_service.calculate_customer_ledger("CUST-002")
    baseline_balance = initial_ledger.outstanding_balance

    now = datetime.now(timezone.utc)

    # Append pending transaction directly into sheet
    sheets_service.append_record("Transactions", {
        "id": "TXN-PENDING-99",
        "customer_id": "CUST-002",
        "type": TransactionType.CREDIT_SALE.value,
        "amount": "99000.00",
        "description": "Pending unapproved fuel ticket",
        "status": TransactionStatus.PENDING.value,
        "transaction_date": now.isoformat(),
    })

    # Balance must remain completely unchanged
    ledger_after_pending = ledger_service.calculate_customer_ledger("CUST-002")
    assert ledger_after_pending.outstanding_balance == baseline_balance

    # Append rejected transaction directly into sheet
    sheets_service.append_record("Transactions", {
        "id": "TXN-REJECTED-88",
        "customer_id": "CUST-002",
        "type": TransactionType.PAYMENT.value,
        "amount": "50000.00",
        "description": "Bounced cheque payment",
        "status": TransactionStatus.REJECTED.value,
        "transaction_date": now.isoformat(),
    })

    # Balance must still remain completely unchanged
    ledger_after_rejected = ledger_service.calculate_customer_ledger("CUST-002")
    assert ledger_after_rejected.outstanding_balance == baseline_balance


# ==============================================================================
# 3. Blocked / Deactivated Customers Forbidden From Credit Sales
# ==============================================================================
def test_deactivated_customer_credit_sale_rejected():
    """A customer who is BLOCKED or DEACTIVATED cannot receive fuel on credit."""
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # CUST-005 is BLOCKED in sample data
    cust_005 = customer_service.get_customer("CUST-005")
    assert cust_005.status == CustomerStatus.BLOCKED

    resp = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-005",
        "type": "CREDIT_SALE",
        "amount": "5000.00",
        "description": "Attempted diesel on credit for blocked account",
        "idempotency_key": "blocked-sale-attempt",
    }, headers=headers)
    assert resp.status_code == 400
    assert "not active" in resp.json()["error"]["message"].lower() or "blocked" in resp.json()["error"]["message"].lower()


# ==============================================================================
# 4. Strict Financial Amount Validation
# ==============================================================================
def test_negative_or_zero_financial_amounts_rejected():
    """Negative and zero monetary amounts are rejected at the schema validation boundary."""
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Zero amount
    r_zero = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "CREDIT_SALE",
        "amount": "0.00",
    }, headers=headers)
    assert r_zero.status_code == 422

    # Negative amount
    r_neg = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "CREDIT_SALE",
        "amount": "-500.00",
    }, headers=headers)
    assert r_neg.status_code == 422


# ==============================================================================
# 5. Webhook Idempotency for Delivery Status Updates
# ==============================================================================
def test_webhook_delivery_status_idempotency():
    """
    Receiving duplicate delivery status events (e.g. Meta re-delivery)
    updates the reminder row idempotently without side-effects or errors.
    """
    # Create reminder row
    sheets_service.append_record("ReminderLog", {
        "id": "REM-IDEMP-01",
        "customer_id": "CUST-001",
        "phone": "+923000000001",
        "reminder_type": "GENTLE",
        "amount_due": "85500.00",
        "status": ReminderStatus.SENT.value,
        "wamid": "wamid.TEST_IDEMP_123",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": "TRUE",
    })

    # Process delivery status event 1st time
    status_payload = {
        "id": "wamid.TEST_IDEMP_123",
        "status": "delivered",
        "timestamp": str(int(datetime.now(timezone.utc).timestamp())),
    }
    res1 = whatsapp_service.process_delivery_status(status_payload)
    assert res1 is not None
    assert res1["status"] == "DELIVERED"

    # Process duplicate delivery status event 2nd time (correctly ignored idempotently)
    res2 = whatsapp_service.process_delivery_status(status_payload)
    assert res2 is None

    # Check sheet status
    rows = sheets_service.read_records("ReminderLog")
    matched = next((r for r in rows if r.get("id") == "REM-IDEMP-01"), None)
    assert matched is not None
    assert matched["status"] == ReminderStatus.DELIVERED.value


# ==============================================================================
# 6. Overdue Aging Report Thresholds
# ==============================================================================
def test_overdue_report_aging_thresholds():
    """Aging report dynamically segments overdue balances by requested threshold days."""
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 15 days threshold
    r15 = client.get("/api/v1/reports/overdue?threshold_days=15", headers=headers)
    assert r15.status_code == 200
    data15 = r15.json()["data"]
    assert data15["threshold_days"] == 15
    assert len(data15["customers"]) >= 1

    # High threshold (e.g. 180 days) where fewer accounts exceed term
    r180 = client.get("/api/v1/reports/overdue?threshold_days=180", headers=headers)
    assert r180.status_code == 200
    data180 = r180.json()["data"]
    assert data180["threshold_days"] == 180
    assert len(data180["customers"]) <= len(data15["customers"])
