"""
System Settings Schema for Gujjar Petrolium Kot Gujjran.
Stores business identity, recovery automation rules, and pump payment details.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.constants import (
    DEFAULT_BUSINESS_NAME,
    DEFAULT_BUSINESS_NAME_UR,
    DEFAULT_MANAGER_NAME,
    DEFAULT_CURRENCY,
    DEFAULT_TIMEZONE,
    DEFAULT_LANGUAGE,
    MessagingMode,
)


class BankAccountDetail(BaseModel):
    bank_name: str = Field(..., description="e.g. Meezan Bank, HBL, Bank of Punjab")
    bank_name_ur: Optional[str] = None
    account_title: str = Field(..., description="Account Title (e.g. Muhammad Asad / Gujjar Petrolium)")
    account_number: str = Field(..., description="Account Number or IBAN")
    branch_name: Optional[str] = None


class SystemSettings(BaseModel):
    business_name: str = Field(default=DEFAULT_BUSINESS_NAME)
    business_name_ur: str = Field(default=DEFAULT_BUSINESS_NAME_UR)
    manager_name: str = Field(default=DEFAULT_MANAGER_NAME)
    location: str = Field(default="Kot Gujjran, Punjab, Pakistan")
    location_ur: str = Field(default="کوٹ گجراں، پنجاب، پاکستان")
    currency: str = Field(default=DEFAULT_CURRENCY)
    timezone: str = Field(default=DEFAULT_TIMEZONE)
    default_language: str = Field(default=DEFAULT_LANGUAGE)
    
    # Recovery & Messaging Automation Rules
    messaging_mode: MessagingMode = Field(default=MessagingMode.DRY_RUN)
    overdue_threshold_days: int = Field(default=15, ge=1, le=180, description="Days after which unpaid credit is marked overdue")
    cooldown_days_between_reminders: int = Field(default=3, ge=1, le=30, description="Minimum days before sending next reminder to same customer")
    auto_reminders_enabled: bool = Field(default=False, description="Master switch for automated background reminders")

    # Payment details to display on reminders/receipts
    bank_accounts: List[BankAccountDetail] = Field(default_factory=list)
    contact_phone: Optional[str] = Field(default="+923000000000")


class SystemSettingsUpdate(BaseModel):
    manager_name: Optional[str] = None
    messaging_mode: Optional[MessagingMode] = None
    overdue_threshold_days: Optional[int] = Field(None, ge=1, le=180)
    cooldown_days_between_reminders: Optional[int] = Field(None, ge=1, le=30)
    auto_reminders_enabled: Optional[bool] = None
    bank_accounts: Optional[List[BankAccountDetail]] = None
    contact_phone: Optional[str] = None
