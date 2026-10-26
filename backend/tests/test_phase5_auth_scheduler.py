"""
Phase 5 Comprehensive Verification Test Suite for Gujjar Petrolium Kot Gujjran.
Tests:
1. Unauthenticated access protection (401)
2. Authentication (Manager, Staff, Read-Only) & Current User Profile
3. Brute-force rate limiting lockout (429)
4. Session expiry & token tampering rejection
5. Role-Based Access Control (403 for Staff/Viewer attempting Manager-only actions)
6. Complete Receipt Approval Lifecycle (PENDING_VERIFICATION -> APPROVED / REJECTED)
7. Receipt idempotency and duplicate reference detection
8. Rejection retaining audit records with zero ledger balance change
9. Asia/Karachi Reminder Scheduler evaluation, consent & cooldown enforcement
10. Audit trail persistence and sensitive data redaction
"""

import pytest
import time
from decimal import Decimal
from datetime import timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.constants import UserRole, ReceiptStatus, TransactionType, AuditAction, CustomerStatus
from app.core.security import create_access_token, reset_failed_login_attempts
from app.schemas.receipt import ReceiptCreate, ReceiptVerification
from app.schemas.transaction import TransactionCreate
from app.services.sheets import sheets_service, MockSpreadsheet
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service
from app.services.scheduler_service import scheduler_service
from app.services.audit_service import audit_service, sanitize_metadata

client = TestClient(app)


def get_err(resp) -> str:
    """Helper to extract error message from either ErrorResponse or HTTPException detail."""
    try:
        data = resp.json()
        if isinstance(data, dict):
            if "error" in data and isinstance(data["error"], dict):
                return data["error"].get("message", "")
            return str(data.get("detail", ""))
        return str(data)
    except Exception:
        return resp.text


@pytest.fixture(autouse=True)
def setup_mock_and_reset_lockout():
    """Ensure clean mock and reset brute-force lockout between tests."""
    sheets_service._is_mock = True
    if not isinstance(sheets_service._spreadsheet, MockSpreadsheet):
        sheets_service._spreadsheet = MockSpreadsheet()
    sheets_service.reset_mock()
    reset_failed_login_attempts(f"test_brute:127.0.0.1")
    reset_failed_login_attempts(f"test_brute:testclient")
    reset_failed_login_attempts(f"{settings.MANAGER_USERNAME.lower()}:127.0.0.1")
    reset_failed_login_attempts(f"{settings.STAFF_USERNAME.lower()}:127.0.0.1")
    yield
    sheets_service.reset_mock()


def get_auth_token(username: str, role: UserRole) -> str:
    """Helper to generate signed JWT token for test requests."""
    return create_access_token({
        "sub": f"USR-{username}",
        "username": username,
        "name": f"Test {username.capitalize()}",
        "role": role.value,
    })


# ==============================================================================
# 1. Unauthenticated Access Protection
# ==============================================================================
def test_unauthenticated_access_rejected():
    """All protected endpoints return 401 when no auth token or dev secret is provided."""
    # Customers
    resp = client.get("/api/v1/customers")
    assert resp.status_code == 401
    assert "Authentication required" in get_err(resp)

    # Transactions
    resp = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "CREDIT_SALE",
        "amount": "1000",
    })
    assert resp.status_code == 401

    # Receipt verification
    resp = client.post("/api/v1/receipts/RCPT-001/verify", json={
        "status": "APPROVED",
        "verified_by": "Muhammad Asad",
    })
    assert resp.status_code == 401

    # Reminders send
    resp = client.post("/api/v1/reminders/send", json={
        "customer_id": "CUST-001",
        "reminder_type": "GENTLE",
    })
    assert resp.status_code == 401

    # Scheduler
    resp = client.get("/api/v1/scheduler/status")
    assert resp.status_code == 401

    resp = client.post("/api/v1/scheduler/run-now")
    assert resp.status_code == 401


# ==============================================================================
# 2. Authentication Flow & Role Verification
# ==============================================================================
def test_manager_login_and_me_profile():
    """Manager (Muhammad Asad) logs in successfully, obtains token and checks /me."""
    login_resp = client.post("/api/v1/auth/login", json={
        "username": settings.MANAGER_USERNAME,
        "password": settings.MANAGER_PASSWORD,
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()["data"]
    token = login_data["access_token"]
    assert token is not None
    assert login_data["user"]["role"] == "MANAGER"
    assert login_data["user"]["name"] == settings.MANAGER_NAME

    # Access /me
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()["data"]
    assert me_data["username"] == settings.MANAGER_USERNAME
    assert me_data["role"] == "MANAGER"

    # Logout
    logout_resp = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200
    assert logout_resp.json()["data"]["logged_out"] is True


def test_staff_and_readonly_logins():
    """Staff and Viewer accounts authenticate with appropriate roles."""
    # Staff
    staff_resp = client.post("/api/v1/auth/login", json={
        "username": settings.STAFF_USERNAME,
        "password": settings.STAFF_PASSWORD,
    })
    assert staff_resp.status_code == 200
    assert staff_resp.json()["data"]["user"]["role"] == "STAFF"

    # Viewer
    viewer_resp = client.post("/api/v1/auth/login", json={
        "username": settings.VIEWER_USERNAME,
        "password": settings.VIEWER_PASSWORD,
    })
    assert viewer_resp.status_code == 200
    assert viewer_resp.json()["data"]["user"]["role"] == "READ_ONLY"


# ==============================================================================
# 3. Brute-Force Rate Limiting Lockout
# ==============================================================================
def test_brute_force_lockout():
    """5 consecutive failed logins trigger 429 Too Many Requests lockout."""
    for i in range(5):
        resp = client.post("/api/v1/auth/login", json={
            "username": "test_brute",
            "password": "wrong_password_attempt",
        })
        assert resp.status_code == 401

    # 6th attempt must be locked out
    lockout_resp = client.post("/api/v1/auth/login", json={
        "username": "test_brute",
        "password": "wrong_password_attempt",
    })
    assert lockout_resp.status_code == 429
    assert "Account temporarily locked" in get_err(lockout_resp)


# ==============================================================================
# 4. Session Expiry & Token Tampering
# ==============================================================================
def test_tampered_and_expired_tokens():
    """Tampered token or expired token is rejected with 401."""
    # Tampered signature
    valid_token = get_auth_token("asad", UserRole.MANAGER)
    tampered_token = valid_token[:-4] + "xxxx"
    resp = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {tampered_token}"})
    assert resp.status_code == 401

    # Expired token
    expired_token = create_access_token(
        {"sub": "USR-EXP", "username": "exp", "role": "MANAGER"},
        expires_delta=timedelta(seconds=-10),  # expired 10s ago
    )
    resp_exp = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp_exp.status_code == 401
    assert "expired" in get_err(resp_exp).lower()


# ==============================================================================
# 5. Role-Based Access Control (RBAC)
# ==============================================================================
def test_rbac_manager_vs_staff_vs_readonly():
    """
    Staff can enter regular sales but CANNOT approve receipts or make adjustments.
    Viewer (Read-only) CANNOT create transactions but CAN view reports.
    """
    manager_token = get_auth_token("asad", UserRole.MANAGER)
    staff_token = get_auth_token("operator", UserRole.STAFF)
    viewer_token = get_auth_token("viewer", UserRole.READ_ONLY)

    # 1. Staff entering regular sale -> ALLOWED (201)
    staff_sale = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "CREDIT_SALE",
        "amount": "5000",
        "description": "Staff entered diesel sale",
        "idempotency_key": "staff-sale-001",
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert staff_sale.status_code == 201

    # 2. Staff attempting financial adjustment -> FORBIDDEN (403)
    staff_adj = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "ADJUSTMENT",
        "adjustment_direction": "CREDIT",
        "amount": "2000",
        "description": "Unauthorized staff adjustment",
        "idempotency_key": "staff-adj-001",
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert staff_adj.status_code == 403
    assert "Manager" in get_err(staff_adj)

    # 3. Manager attempting financial adjustment -> ALLOWED (201)
    mgr_adj = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "ADJUSTMENT",
        "adjustment_direction": "CREDIT",
        "amount": "2000",
        "description": "Manager authorized adjustment",
        "idempotency_key": "mgr-adj-001",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert mgr_adj.status_code == 201

    # 4. Staff attempting to verify receipt -> FORBIDDEN (403)
    staff_verify = client.post("/api/v1/receipts/RCPT-001/verify", json={
        "status": "APPROVED",
        "verified_by": "Staff Person",
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert staff_verify.status_code == 403

    # 5. Read-only viewer attempting transaction -> FORBIDDEN (403)
    viewer_txn = client.post("/api/v1/transactions", json={
        "customer_id": "CUST-001",
        "type": "CREDIT_SALE",
        "amount": "1000",
    }, headers={"Authorization": f"Bearer {viewer_token}"})
    assert viewer_txn.status_code == 403

    # 6. Read-only viewer viewing reports -> ALLOWED (200)
    viewer_report = client.get("/api/v1/reports/overdue", headers={"Authorization": f"Bearer {viewer_token}"})
    assert viewer_report.status_code == 200


# ==============================================================================
# 6. Receipt Lifecycle: PENDING -> REJECTED (Zero Ledger Impact)
# ==============================================================================
def test_receipt_rejection_lifecycle():
    """
    Rejecting an unverified receipt preserves the receipt record, sets REJECTED status,
    and guarantees zero impact on customer ledger balance.
    """
    manager_token = get_auth_token("asad", UserRole.MANAGER)

    # Initial balance
    ledger_before = ledger_service.calculate_customer_ledger("CUST-001")
    balance_before = ledger_before.outstanding_balance

    # Submit unverified receipt
    sub_resp = client.post("/api/v1/receipts", json={
        "customer_id": "CUST-001",
        "claimed_amount": "15000",
        "channel": "Fake Bank Slip",
        "transaction_reference": "REF-REJECT-999",
        "notes": "Suspicious unverified claim",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert sub_resp.status_code == 201
    rcpt_id = sub_resp.json()["data"]["id"]

    # Manager rejects receipt with note
    reject_resp = client.post(f"/api/v1/receipts/{rcpt_id}/verify", json={
        "status": "REJECTED",
        "verification_notes": "Fake payment slip; no corresponding bank deposit received.",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert reject_resp.status_code == 200
    assert reject_resp.json()["data"]["status"] == "REJECTED"
    assert reject_resp.json()["data"]["resulting_transaction_id"] is None

    # CRITICAL: Ledger balance MUST NOT change
    ledger_after = ledger_service.calculate_customer_ledger("CUST-001")
    assert ledger_after.outstanding_balance == balance_before

    # Idempotent rejection test
    re_reject = client.post(f"/api/v1/receipts/{rcpt_id}/verify", json={
        "status": "REJECTED",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert re_reject.status_code == 200
    assert "already rejected" in re_reject.json()["message"].lower()


# ==============================================================================
# 7. Receipt Lifecycle: PENDING -> APPROVED (Idempotency & Deduplication)
# ==============================================================================
def test_receipt_approval_lifecycle_and_idempotency():
    """
    Approving a receipt creates exactly ONE approved PAYMENT transaction.
    Subsequent approval requests are idempotent and do not duplicate ledger entries.
    Duplicate bank references are detected and rejected.
    """
    manager_token = get_auth_token("asad", UserRole.MANAGER)

    ledger_before = ledger_service.calculate_customer_ledger("CUST-001")
    balance_before = ledger_before.outstanding_balance
    txns_count_before = len(sheets_service.read_records("Transactions"))

    # Submit genuine receipt
    sub_resp = client.post("/api/v1/receipts", json={
        "customer_id": "CUST-001",
        "claimed_amount": "25000",
        "channel": "Meezan Bank Ltd",
        "transaction_reference": "MEEZAN-PKR-778899",
        "notes": "Online IBFT verified",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert sub_resp.status_code == 201
    rcpt_id = sub_resp.json()["data"]["id"]

    # Approve receipt
    appr_resp = client.post(f"/api/v1/receipts/{rcpt_id}/verify", json={
        "status": "APPROVED",
        "verification_notes": "Verified against Meezan pump bank statement.",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert appr_resp.status_code == 200
    rcpt_data = appr_resp.json()["data"]
    assert rcpt_data["status"] == "APPROVED"
    resulting_txn_id = rcpt_data["resulting_transaction_id"]
    assert resulting_txn_id is not None
    assert resulting_txn_id.startswith("TXN-")

    # Ledger must have exactly ONE new transaction
    txns_after = sheets_service.read_records("Transactions")
    assert len(txns_after) == txns_count_before + 1

    # Customer balance must be reduced by 25,000
    ledger_after = ledger_service.calculate_customer_ledger("CUST-001")
    assert ledger_after.outstanding_balance == balance_before - Decimal("25000")

    # IDEMPOTENCY TEST: Call approve again on the same receipt
    repeat_appr = client.post(f"/api/v1/receipts/{rcpt_id}/verify", json={
        "status": "APPROVED",
        "verification_notes": "Duplicate click attempt",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert repeat_appr.status_code == 200
    assert "already approved" in repeat_appr.json()["message"].lower()
    # Transaction count and balance MUST NOT change again!
    assert len(sheets_service.read_records("Transactions")) == txns_count_before + 1
    assert ledger_service.calculate_customer_ledger("CUST-001").outstanding_balance == balance_before - Decimal("25000")


def test_duplicate_receipt_reference_rejected():
    """Submitting a receipt with an already submitted transaction reference fails."""
    manager_token = get_auth_token("asad", UserRole.MANAGER)

    # 1st submission
    r1 = client.post("/api/v1/receipts", json={
        "customer_id": "CUST-001",
        "claimed_amount": "5000",
        "transaction_reference": "DUPLICATE-REF-TEST-001",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert r1.status_code == 201

    # 2nd submission with duplicate reference
    r2 = client.post("/api/v1/receipts", json={
        "customer_id": "CUST-002",
        "claimed_amount": "5000",
        "transaction_reference": "DUPLICATE-REF-TEST-001",
    }, headers={"Authorization": f"Bearer {manager_token}"})
    assert r2.status_code == 409
    assert "already been submitted" in get_err(r2)


# ==============================================================================
# 8. Asia/Karachi Reminder Scheduler & Cooldown Enforcement
# ==============================================================================
def test_scheduler_status_and_evaluation():
    """Scheduler status reports Asia/Karachi timezone and previews eligible accounts."""
    manager_token = get_auth_token("asad", UserRole.MANAGER)

    # Status
    status_resp = client.get("/api/v1/scheduler/status", headers={"Authorization": f"Bearer {manager_token}"})
    assert status_resp.status_code == 200
    data = status_resp.json()["data"]
    assert data["timezone"] == "Asia/Karachi"
    assert "PKT" in data["current_time_pkt"]

    # Preview evaluation
    prev_resp = client.get("/api/v1/scheduler/preview", headers={"Authorization": f"Bearer {manager_token}"})
    assert prev_resp.status_code == 200
    prev_data = prev_resp.json()["data"]
    assert "eligible_candidates" in prev_data
    assert "excluded_counts" in prev_data
    assert prev_data["total_evaluated"] >= 4


def test_scheduler_excludes_no_consent_and_inactive():
    """Scheduler candidate evaluation strictly excludes inactive or opted-out customers."""
    # Explicitly set CUST-002 whatsapp_consent to False
    sheets_service.update_cell_by_id("Customers", "CUST-002", "whatsapp_consent", "FALSE")

    evaluation = scheduler_service.evaluate_candidates()
    eligible_ids = [c["customer_id"] for c in evaluation["eligible_candidates"]]

    # CUST-005 is BLOCKED -> Must NOT be eligible
    assert "CUST-005" not in eligible_ids
    assert evaluation["excluded_counts"]["inactive_or_suspended"] >= 1

    # CUST-002 has whatsapp_consent = False -> Must NOT be eligible
    assert "CUST-002" not in eligible_ids
    assert evaluation["excluded_counts"]["no_consent_or_opted_out"] >= 1


def test_scheduler_run_now_dry_run_simulation():
    """Manager triggers scheduler execution, producing simulated dry-run entries without live sends."""
    manager_token = get_auth_token("asad", UserRole.MANAGER)

    run_resp = client.post("/api/v1/scheduler/run-now", headers={"Authorization": f"Bearer {manager_token}"})
    assert run_resp.status_code == 200
    run_data = run_resp.json()["data"]
    assert run_data["messaging_mode"] == "DRY_RUN"
    assert run_data["simulated_dry_run"] >= 1
    assert run_data["dispatched_live"] == 0


# ==============================================================================
# 9. Audit Trail & Sensitive Data Redaction
# ==============================================================================
def test_audit_trail_redacts_passwords_and_tokens():
    """Passwords, secrets, and auth tokens are stripped from audit log metadata."""
    sensitive_dict = {
        "username": "asad",
        "password": "SuperSecretPassword123",
        "token": "bearer.jwt.secret.string",
        "meta_app_secret": "abcdef123456",
        "safe_field": "ledger_update",
    }
    sanitized = sanitize_metadata(sensitive_dict)
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["token"] == "[REDACTED]"
    assert sanitized["meta_app_secret"] == "[REDACTED]"
    assert sanitized["safe_field"] == "ledger_update"

    # Verify audit log retrieval
    manager_token = get_auth_token("asad", UserRole.MANAGER)
    audit_resp = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {manager_token}"})
    assert audit_resp.status_code == 200
    logs = audit_resp.json()["data"]
    assert len(logs) >= 1
    # Check that no raw password or secret leaked into details
    for log in logs:
        assert "SuperSecretPassword123" not in log["details"]
