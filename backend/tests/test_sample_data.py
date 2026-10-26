"""
Tests for Synthetic Sample Demo Data.
Verifies sample data integrity: 5 customers, 10 transactions, 2 receipts, 3 reminders, and settings.
"""

import sys
from pathlib import Path
from decimal import Decimal

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.sample_data import (
    SAMPLE_CUSTOMERS,
    SAMPLE_TRANSACTIONS,
    SAMPLE_RECEIPTS,
    SAMPLE_REMINDERS,
    SAMPLE_SETTINGS,
)
from app.core.constants import ReceiptStatus, ReminderStatus


def test_sample_customers_count_and_fields():
    """Verify exactly 5 synthetic customers with valid IDs and phones."""
    assert len(SAMPLE_CUSTOMERS) == 5
    for c in SAMPLE_CUSTOMERS:
        assert c.id.startswith("CUST-")
        assert c.phone.startswith("+92300000000")
        assert c.credit_limit >= Decimal("0.00")
        assert c.current_balance >= Decimal("0.00")


def test_sample_transactions_count_and_types():
    """Verify exactly 10 synthetic transactions."""
    assert len(SAMPLE_TRANSACTIONS) == 10
    customer_ids = {c.id for c in SAMPLE_CUSTOMERS}
    for t in SAMPLE_TRANSACTIONS:
        assert t.id.startswith("TXN-")
        assert t.customer_id in customer_ids
        assert t.amount > Decimal("0.00")


def test_sample_receipts_count_and_status():
    """Verify exactly 2 pending payment receipts in queue."""
    assert len(SAMPLE_RECEIPTS) == 2
    for r in SAMPLE_RECEIPTS:
        assert r.id.startswith("RCPT-")
        assert r.status == ReceiptStatus.PENDING_VERIFICATION
        assert r.claimed_amount > Decimal("0.00")


def test_sample_reminders_count():
    """Verify exactly 3 synthetic reminder records."""
    assert len(SAMPLE_REMINDERS) == 3
    for rem in SAMPLE_REMINDERS:
        assert rem.id.startswith("REM-")
        assert rem.dry_run is True
        assert len(rem.message_text_ur) > 10


def test_sample_settings_identity():
    """Verify sample business settings match required business details."""
    assert SAMPLE_SETTINGS.business_name == "Gujjar Petrolium Kot Gujjran"
    assert SAMPLE_SETTINGS.business_name_ur == "گجر پیٹرولیم، کوٹ گجراں"
    assert SAMPLE_SETTINGS.manager_name == "Muhammad Asad"
    assert SAMPLE_SETTINGS.currency == "PKR"
    assert SAMPLE_SETTINGS.timezone == "Asia/Karachi"
    assert len(SAMPLE_SETTINGS.bank_accounts) >= 2
