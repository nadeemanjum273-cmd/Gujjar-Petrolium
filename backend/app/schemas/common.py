"""
Common Schemas, Types, and Validators for Gujjar Petrolium Kot Gujjran.
Enforces Decimal money handling, phone normalization, and standard API responses.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
import re
from typing import Generic, Optional, TypeVar, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


T = TypeVar("T")

# Regex for Pakistani mobile numbers: matches +923XXXXXXXXX, 923XXXXXXXXX, 03XXXXXXXXX
PAK_PHONE_REGEX = re.compile(r"^(?:\+92|92|0)?(3\d{9})$")


def normalize_pakistani_phone(v: str) -> str:
    """
    Validates and normalizes a Pakistani mobile number into international E.164 format (+923XXXXXXXXX).
    Rejects invalid formats or non-mobile numbers.
    """
    if not isinstance(v, str):
        raise ValueError("Phone number must be a string")
    
    cleaned = re.sub(r"[\s\-\(\)]", "", v.strip())
    match = PAK_PHONE_REGEX.match(cleaned)
    if not match:
        raise ValueError(
            f"Invalid Pakistani phone number format: '{v}'. Must be a 10-11 digit mobile number starting with 03 or +923."
        )
    subscriber_number = match.group(1)  # 3XXXXXXXXX (10 digits)
    return f"+92{subscriber_number}"


def validate_money_decimal(v: Any, allow_zero: bool = False) -> Decimal:
    """
    Validates monetary value:
    - Enforces Decimal type
    - Rounds to 2 decimal places
    - Forbids binary floating-point imprecision when passed as float
    - Ensures amount is positive (or non-negative if allow_zero=True)
    """
    if isinstance(v, float):
        # Convert via str to prevent binary float representation noise
        v_str = f"{v:.4f}"
        d = Decimal(v_str).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    elif isinstance(v, (int, str)):
        try:
            d = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, TypeError):
            raise ValueError(f"Invalid monetary decimal format: {v}")
    elif isinstance(v, Decimal):
        d = v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        raise ValueError(f"Invalid monetary value type: {type(v)}")

    if allow_zero:
        if d < Decimal("0.00"):
            raise ValueError("Monetary amount cannot be negative")
    else:
        if d <= Decimal("0.00"):
            raise ValueError("Monetary amount must be strictly greater than zero")

    return d


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    app_name_ur: str
    version: str = "1.0.0"
    environment: str
    server_time: datetime
    timezone: str
    manager: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    message_ur: Optional[str] = None
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    message_ur: Optional[str] = None
    data: T
