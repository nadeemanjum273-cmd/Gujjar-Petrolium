"""
Tests for Data Schemas, Enums, and Duplicate Validation.
"""

import sys
from pathlib import Path
from decimal import Decimal
import pytest
from pydantic import ValidationError

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.constants import (
    CustomerStatus,
    TransactionType,
    TransactionStatus,
    ReceiptStatus,
    ReminderStatus,
)
from app.schemas.customer import Customer, CustomerCreate
from app.schemas.transaction import Transaction, TransactionCreate, AdjustmentDirection
from app.schemas.receipt import ReceiptQueue, ReceiptCreate
from app.schemas.reminder import ReminderLog, ReminderCreate
from app.services.store import InMemoryStore


def test_customer_valid_creation():
    """Test creating a customer with valid data and phone normalization."""
    cust = CustomerCreate(
        name="Chaudhry Akram",
        name_ur="چوہدری اکرم",
        phone="0301-2345678",  # Local Pakistani format
        status=CustomerStatus.ACTIVE,
        credit_limit=Decimal("100000.00"),
    )
    # Phone should be normalized to +923012345678
    assert cust.phone == "+923012345678"
    assert cust.status == CustomerStatus.ACTIVE


def test_customer_invalid_phone():
    """Test that non-Pakistani or malformed phone numbers are rejected."""
    with pytest.raises(ValidationError):
        CustomerCreate(
            name="Invalid Phone User",
            phone="12345",  # Too short
        )

    with pytest.raises(ValidationError):
        CustomerCreate(
            name="US Number",
            phone="+12125551234",  # Not a Pakistani mobile
        )


def test_customer_enum_validation():
    """Test valid and invalid CustomerStatus enum values."""
    assert CustomerStatus("ACTIVE") == CustomerStatus.ACTIVE
    assert CustomerStatus("BLOCKED") == CustomerStatus.BLOCKED

    with pytest.raises(ValidationError):
        CustomerCreate(
            name="Test",
            phone="03001234567",
            status="UNKNOWN_STATUS",  # Invalid enum
        )


def test_duplicate_customer_id_rejection():
    """Test that store rejects duplicate customer IDs."""
    store = InMemoryStore()
    # Try adding a customer with an already existing ID
    with pytest.raises(ValueError, match="Duplicate Customer ID 'CUST-001' already exists"):
        store.create_customer(
            CustomerCreate(
                id="CUST-001",
                name="Duplicate Tariq",
                phone="03009999999",
            )
        )


def test_duplicate_receipt_id_rejection():
    """Test that store rejects duplicate receipt IDs."""
    store = InMemoryStore()
    with pytest.raises(ValueError, match="Duplicate Receipt ID 'RCPT-001' already exists"):
        store.create_receipt(
            ReceiptCreate(
                id="RCPT-001",
                customer_id="CUST-001",
                claimed_amount=Decimal("10000.00"),
            )
        )


def test_transaction_idempotency():
    """Test that duplicate transaction submissions with same idempotency_key return existing record."""
    store = InMemoryStore()
    payload = TransactionCreate(
        customer_id="CUST-001",
        type=TransactionType.CREDIT_SALE,
        amount=Decimal("5000.00"),
        description="Idempotent Test Sale",
        idempotency_key="idemp-key-unique-999",
    )
    txn1 = store.create_transaction(payload)
    txn2 = store.create_transaction(payload)
    assert txn1.id == txn2.id


def test_transaction_fuel_calculation_mismatch():
    """Test that transaction fails if liters * rate does not match total amount."""
    with pytest.raises(ValidationError, match="does not match liters"):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.CREDIT_SALE,
            amount=Decimal("10000.00"),  # Expected: 100 * 280 = 28,000
            description="Mismatched Diesel Sale",
            liters=Decimal("100.00"),
            rate_per_liter=Decimal("280.00"),
        )


def test_adjustment_direction_required():
    """Test that an ADJUSTMENT transaction requires an adjustment_direction."""
    with pytest.raises(ValidationError, match="must specify an adjustment_direction"):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.ADJUSTMENT,
            amount=Decimal("500.00"),
            description="Unspecified adjustment",
            adjustment_direction=None,
        )

    # With valid direction it should succeed
    txn = TransactionCreate(
        customer_id="CUST-001",
        type=TransactionType.ADJUSTMENT,
        amount=Decimal("500.00"),
        description="Waived roundoff adjustment",
        adjustment_direction=AdjustmentDirection.CREDIT,
    )
    assert txn.adjustment_direction == AdjustmentDirection.CREDIT
