"""
Comprehensive Test Suite for Phase 2: Google Sheets, Authoritative Ledger Math, and Overdue Reports.
"""

import sys
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.config import settings
from app.core.constants import TransactionStatus, TransactionType, CustomerStatus
from app.schemas.transaction import TransactionCreate, AdjustmentDirection
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.sheets import sheets_service, MockSpreadsheet, SchemaValidationError, GoogleSheetsAPIError
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service

client = TestClient(app)
DEV_AUTH_HEADERS = {"X-Dev-Manager-Secret": settings.ADMIN_SESSION_SECRET}


@pytest.fixture(autouse=True)
def reset_sheets_state():
    """Ensure clean isolated mock spreadsheet before each test."""
    sheets_service._is_mock = True
    if not isinstance(sheets_service._spreadsheet, MockSpreadsheet):
        sheets_service._spreadsheet = MockSpreadsheet()
    sheets_service.reset_mock()
    yield
    sheets_service.reset_mock()


# ------------------------------------------------------------------------------
# 1. Financial Ledger Calculations
# ------------------------------------------------------------------------------
def test_approved_credit_sale_increases_balance():
    """Approved credit sale increases the customer's balance."""
    ledger_before = ledger_service.calculate_customer_ledger("CUST-004")
    assert ledger_before.outstanding_balance == Decimal("0.00")

    # Record approved credit sale of PKR 15,000
    sale_data = TransactionCreate(
        customer_id="CUST-004",
        type=TransactionType.CREDIT_SALE,
        amount=Decimal("15000.00"),
        description="Diesel dispensing test",
        liters=Decimal("50.00"),
        rate_per_liter=Decimal("300.00"),
    )
    ledger_service.create_transaction(sale_data, actor_role="MANAGER")

    ledger_after = ledger_service.calculate_customer_ledger("CUST-004")
    assert ledger_after.outstanding_balance == Decimal("15000.00")
    assert ledger_after.total_approved_debits == Decimal("65000.00")  # 50,000 initial + 15,000


def test_approved_partial_payment_reduces_balance():
    """Approved partial payment reduces the customer's balance."""
    ledger_before = ledger_service.calculate_customer_ledger("CUST-001")
    initial_balance = ledger_before.outstanding_balance
    assert initial_balance == Decimal("85500.00")

    # Record approved payment of PKR 35,500
    payment_data = TransactionCreate(
        customer_id="CUST-001",
        type=TransactionType.PAYMENT,
        amount=Decimal("35500.00"),
        description="Partial bank transfer clearance",
    )
    ledger_service.create_transaction(payment_data, actor_role="MANAGER")

    ledger_after = ledger_service.calculate_customer_ledger("CUST-001")
    assert ledger_after.outstanding_balance == initial_balance - Decimal("35500.00")
    assert ledger_after.outstanding_balance == Decimal("50000.00")


def test_pending_payment_does_not_reduce_balance():
    """Pending payments must NOT reduce outstanding balance."""
    ledger_before = ledger_service.calculate_customer_ledger("CUST-001")
    initial_balance = ledger_before.outstanding_balance

    # Record pending payment from operator
    pending_payment = TransactionCreate(
        customer_id="CUST-001",
        type=TransactionType.PAYMENT,
        amount=Decimal("20000.00"),
        description="Cash slip submitted by operator - awaiting count",
    )
    # When recorded by operator, initial status is PENDING
    txn = ledger_service.create_transaction(pending_payment, actor_role="OPERATOR")
    assert txn.status == TransactionStatus.PENDING

    ledger_after = ledger_service.calculate_customer_ledger("CUST-001")
    # Balance must remain unchanged
    assert ledger_after.outstanding_balance == initial_balance
    # Pending count & amount tracked separately
    assert ledger_after.pending_payments_count >= 1
    assert ledger_after.pending_payments_amount == Decimal("20000.00")


def test_rejected_payment_does_not_reduce_balance():
    """Rejected payments must NOT reduce outstanding balance."""
    ledger_before = ledger_service.calculate_customer_ledger("CUST-001")
    initial_balance = ledger_before.outstanding_balance

    # Inject rejected payment directly into Transactions sheet
    sheets_service.append_record("Transactions", {
        "id": "TXN-99999",
        "customer_id": "CUST-001",
        "type": "PAYMENT",
        "amount": "40000.00",
        "description": "Bounced cheque payment",
        "transaction_date": datetime.utcnow().isoformat(),
        "status": "REJECTED",
        "created_by": "Operator",
        "created_at": datetime.utcnow().isoformat(),
    })

    ledger_after = ledger_service.calculate_customer_ledger("CUST-001")
    # Balance must remain untouched
    assert ledger_after.outstanding_balance == initial_balance


def test_negative_or_malformed_amounts_rejected():
    """Negative, zero, or malformed transaction amounts must fail validation."""
    with pytest.raises(Exception):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.CREDIT_SALE,
            amount=Decimal("-500.00"),
            description="Negative sale",
        )

    with pytest.raises(Exception):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.PAYMENT,
            amount=Decimal("0.00"),
            description="Zero payment",
        )


def test_duplicate_transaction_safely_deduplicated():
    """Duplicate submissions with same idempotency_key return existing record without double posting."""
    payload = TransactionCreate(
        customer_id="CUST-002",
        type=TransactionType.CREDIT_SALE,
        amount=Decimal("12000.00"),
        description="Duplicate test sale",
        idempotency_key="dispenser-sale-uuid-7711",
    )

    txn1 = ledger_service.create_transaction(payload, actor_role="MANAGER")
    txn2 = ledger_service.create_transaction(payload, actor_role="MANAGER")

    assert txn1.id == txn2.id
    # Check that it was not posted twice
    all_matching = [
        t for t in ledger_service.list_transactions(customer_id="CUST-002")
        if t.idempotency_key == "dispenser-sale-uuid-7711"
    ]
    assert len(all_matching) == 1


def test_unknown_customer_id_rejected():
    """Transactions targeting non-existent customer IDs must be rejected."""
    payload = TransactionCreate(
        customer_id="CUST-NONEXISTENT-999",
        type=TransactionType.PAYMENT,
        amount=Decimal("5000.00"),
        description="Payment for ghost customer",
    )
    with pytest.raises(ValueError, match="does not exist"):
        ledger_service.create_transaction(payload)


def test_blocked_customer_cannot_receive_credit_sale():
    """Blocked customers (e.g. CUST-005) cannot take additional fuel on credit."""
    payload = TransactionCreate(
        customer_id="CUST-005",
        type=TransactionType.CREDIT_SALE,
        amount=Decimal("5000.00"),
        description="Attempted credit sale to blocked customer",
    )
    with pytest.raises(ValueError, match="is BLOCKED"):
        ledger_service.create_transaction(payload)


# ------------------------------------------------------------------------------
# 2. Google Sheets Schema Validation & Error Handling
# ------------------------------------------------------------------------------
def test_sheets_schema_validation_catches_missing_tab():
    """Sheets validation raises SchemaValidationError if a required tab is missing."""
    with pytest.raises(SchemaValidationError, match="does not exist"):
        sheets_service.validate_tab_and_headers("NonExistentTab")


def test_sheets_schema_validation_catches_missing_header():
    """Sheets validation catches missing headers without overwriting sheet."""
    # Temporarily corrupt mock headers for testing
    worksheet = sheets_service._spreadsheet.worksheet("Customers")
    original_row = worksheet.rows[0]
    worksheet.rows[0] = ["id", "name"]  # Missing phone, status, etc.

    with pytest.raises(SchemaValidationError, match="Missing required columns"):
        sheets_service.validate_tab_and_headers("Customers")

    # Restore
    worksheet.rows[0] = original_row


def test_sheets_error_does_not_create_false_success():
    """Underlying Google Sheets API errors raise exceptions and do not report false success."""
    def failing_action():
        raise Exception("Google API Error 503 Backend Service Unavailable")

    with pytest.raises(GoogleSheetsAPIError):
        sheets_service._execute_with_retry("test_fail", failing_action)


# ------------------------------------------------------------------------------
# 3. Overdue Aging & Timezone Calculation
# ------------------------------------------------------------------------------
def test_overdue_report_identifies_overdue_customer():
    """Verifies that customers exceeding threshold days past due appear in overdue report."""
    report = ledger_service.generate_overdue_report(threshold_days=15)
    assert report.threshold_days == 15
    assert report.total_overdue_customers >= 1
    assert report.total_overdue_amount > Decimal("0.00")

    # CUST-005 has an unpaid transaction from 40 days ago
    cust_5_item = next((c for c in report.customers if c.customer_id == "CUST-005"), None)
    assert cust_5_item is not None
    assert cust_5_item.days_overdue >= 39
    assert cust_5_item.outstanding_balance == Decimal("62300.00")


# ------------------------------------------------------------------------------
# 4. API Endpoints Integration Tests
# ------------------------------------------------------------------------------
def test_api_list_and_search_customers():
    """GET /api/v1/customers with search filter."""
    res = client.get("/api/v1/customers?search=Tariq", headers=DEV_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == "CUST-001"


def test_api_get_customer_ledger():
    """GET /api/v1/customers/{customer_id}/ledger returns full running statement."""
    res = client.get("/api/v1/customers/CUST-001/ledger", headers=DEV_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["customer"]["id"] == "CUST-001"
    assert "ledger_entries" in data
    assert len(data["ledger_entries"]) >= 2
    assert float(data["outstanding_balance"]) == 85500.00


def test_api_post_customer_with_safeguard():
    """POST /api/v1/customers enforces dev auth header and registers customer."""
    new_cust_payload = {
        "name": "Nawaz Sharif Daewoo Express",
        "name_ur": "نواز شریف ڈائیوو ایکسپریس",
        "phone": "0300-8877665",
        "credit_limit": "200000.00",
        "address": "Kot Gujjran Terminal",
    }

    # Missing header -> 401 Unauthorized
    res_unauth = client.post("/api/v1/customers", json=new_cust_payload)
    assert res_unauth.status_code == 401

    # With header -> 201 Created
    res_auth = client.post("/api/v1/customers", json=new_cust_payload, headers=DEV_AUTH_HEADERS)
    assert res_auth.status_code == 201
    created_cust = res_auth.json()["data"]
    assert created_cust["phone"] == "+923008877665"
    assert created_cust["name"] == "Nawaz Sharif Daewoo Express"


def test_api_post_transaction_with_safeguard():
    """POST /api/v1/transactions records credit sale and updates ledger."""
    txn_payload = {
        "customer_id": "CUST-004",
        "type": "CREDIT_SALE",
        "amount": "25000.00",
        "description": "Diesel delivery for truck",
        "fuel_type": "Diesel (ڈیزل)",
        "liters": "100.00",
        "rate_per_liter": "250.00",
        "idempotency_key": "api-txn-key-9090",
    }

    # Unauthorized
    res_unauth = client.post("/api/v1/transactions", json=txn_payload)
    assert res_unauth.status_code == 401

    # Authorized
    res_auth = client.post("/api/v1/transactions", json=txn_payload, headers=DEV_AUTH_HEADERS)
    assert res_auth.status_code == 201
    data = res_auth.json()["data"]
    assert data["id"].startswith("TXN-")
    assert data["status"] == "APPROVED"


def test_api_get_overdue_report():
    """GET /api/v1/reports/overdue returns aging report."""
    res = client.get("/api/v1/reports/overdue?threshold_days=15", headers=DEV_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["threshold_days"] == 15
    assert "total_overdue_amount" in data
    assert len(data["customers"]) >= 1
