"""
Reminder Log Schema for Gujjar Petrolium Kot Gujjran.
Tracks WhatsApp recovery notifications, delivery statuses, and dry-run audit logs.
"""

from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.core.constants import ReminderStatus, ReminderType
from app.schemas.common import normalize_pakistani_phone, validate_money_decimal


class ReminderBase(BaseModel):
    customer_id: str = Field(..., min_length=3, max_length=50, description="Customer recipient ID")
    phone: str = Field(..., description="Recipient phone number")
    reminder_type: ReminderType = Field(default=ReminderType.GENTLE, description="GENTLE, FORMAL, or URGENT")
    amount_due: Decimal = Field(..., description="Outstanding balance included in reminder in PKR")
    message_text: str = Field(..., description="English or Roman Urdu preview")
    message_text_ur: str = Field(..., description="Polite Urdu recovery notification text")
    dry_run: bool = Field(default=True, description="True if simulated in test mode; False if sent live")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_pakistani_phone(v)

    @field_validator("amount_due", mode="before")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        return validate_money_decimal(v, allow_zero=False)


class ReminderCreate(ReminderBase):
    id: Optional[str] = None


class ReminderLog(ReminderBase):
    id: str = Field(..., description="Unique reminder record ID (e.g. REM-001)")
    status: ReminderStatus = Field(default=ReminderStatus.QUEUED, description="QUEUED, SENT, DELIVERED, READ, FAILED")
    whatsapp_message_id: Optional[str] = Field(None, description="Meta WhatsApp message ID (wamid)")
    queued_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None


class ReminderPreviewRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID to preview reminder for")
    override_cooldown: bool = Field(default=False, description="Whether to override cooldown warning")


class ReminderPreviewResponse(BaseModel):
    customer_id: str
    customer_name: str
    customer_name_ur: Optional[str] = None
    phone: str
    current_balance: Decimal
    days_overdue: int
    due_date: Optional[str] = None
    whatsapp_consent: bool
    template_name: str
    template_lang: str
    template_components: list = Field(default_factory=list)
    rendered_message_ur: str
    rendered_message_en: str
    duplicate_warning: bool = False
    last_reminder_at: Optional[datetime] = None
    cooldown_days: int = 3
    can_send: bool = True
    rejection_reasons: list[str] = Field(default_factory=list)


class ReminderSendRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID to send reminder to")
    reminder_type: ReminderType = Field(default=ReminderType.GENTLE, description="GENTLE, FORMAL, or URGENT")
    override_cooldown: bool = Field(default=False, description="Manager override for cooldown check")
    notes: Optional[str] = Field(None, description="Optional managerial notes")


class WhatsAppMessageResponse(BaseModel):
    success: bool
    messaging_product: str = "whatsapp"
    wamid: str
    recipient_phone: str
    status: ReminderStatus
    dry_run: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[str] = None

