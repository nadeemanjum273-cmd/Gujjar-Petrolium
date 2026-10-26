"""
Domain Constants and Enumerations for Gujjar Petrolium Kot Gujjran.
Strict enums are used across data validation, sheets synchronization, and API contracts.
"""

from enum import Enum


class CustomerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class TransactionType(str, Enum):
    CREDIT_SALE = "CREDIT_SALE"   # Fuel/lubricant dispensed on credit (Debit to customer)
    PAYMENT = "PAYMENT"           # Payment received from customer (Credit to customer)
    ADJUSTMENT = "ADJUSTMENT"     # Manager manual adjustment entry (Debit or Credit)


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReceiptStatus(str, Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReminderStatus(str, Enum):
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"


class ReminderType(str, Enum):
    GENTLE = "GENTLE"
    FORMAL = "FORMAL"
    URGENT = "URGENT"


class MessagingMode(str, Enum):
    DRY_RUN = "DRY_RUN"
    LIVE = "LIVE"


class UserRole(str, Enum):
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    READ_ONLY = "READ_ONLY"


class AuditAction(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    SETTINGS_UPDATE = "SETTINGS_UPDATE"


# Default Business Identity Constants
DEFAULT_BUSINESS_NAME = "Gujjar Petrolium Kot Gujjran"
DEFAULT_BUSINESS_NAME_UR = "گجر پیٹرولیم، کوٹ گجراں"
DEFAULT_MANAGER_NAME = "Muhammad Asad"
DEFAULT_CURRENCY = "PKR"
DEFAULT_TIMEZONE = "Asia/Karachi"
DEFAULT_LANGUAGE = "ur"
