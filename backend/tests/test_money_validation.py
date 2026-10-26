"""
Tests for Financial Money Validation and Precision.
Ensures no binary floating-point drift and enforces strictly positive transaction values.
"""

import sys
from pathlib import Path
from decimal import Decimal
import pytest
from pydantic import ValidationError

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.schemas.common import validate_money_decimal
from app.schemas.transaction import TransactionCreate
from app.core.constants import TransactionType


def test_positive_money_validation():
    """Test that positive values parse as Decimal with 2 decimal places."""
    res1 = validate_money_decimal("1500.50", allow_zero=False)
    assert isinstance(res1, Decimal)
    assert res1 == Decimal("1500.50")

    res2 = validate_money_decimal(2500, allow_zero=False)
    assert res2 == Decimal("2500.00")


def test_zero_money_rejection():
    """Test that zero is rejected when allow_zero is False."""
    with pytest.raises(ValueError, match="strictly greater than zero"):
        validate_money_decimal("0.00", allow_zero=False)

    with pytest.raises(ValueError, match="strictly greater than zero"):
        validate_money_decimal(0, allow_zero=False)


def test_negative_money_rejection():
    """Test that negative money amounts are rejected in both modes."""
    with pytest.raises(ValueError, match="strictly greater than zero"):
        validate_money_decimal("-50.00", allow_zero=False)

    with pytest.raises(ValueError, match="cannot be negative"):
        validate_money_decimal("-100.00", allow_zero=True)


def test_transaction_rejects_zero_or_negative_amount():
    """Test that TransactionCreate model rejects zero or negative amounts."""
    with pytest.raises(ValidationError):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.CREDIT_SALE,
            amount=Decimal("0.00"),
            description="Zero sale",
        )

    with pytest.raises(ValidationError):
        TransactionCreate(
            customer_id="CUST-001",
            type=TransactionType.PAYMENT,
            amount=Decimal("-1500.00"),
            description="Negative payment",
        )


def test_decimal_rounding_precision():
    """Test that 3 decimal places quantize to 2 without binary float drift."""
    res = validate_money_decimal("125.456", allow_zero=False)
    assert res == Decimal("125.46")  # ROUND_HALF_UP

    res_round_down = validate_money_decimal("125.454", allow_zero=False)
    assert res_round_down == Decimal("125.45")
