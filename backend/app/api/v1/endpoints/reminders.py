"""
Reminder Log Endpoints for Gujjar Petrolium Kot Gujjran.
Protected by Role-Based Access Control:
- Manager authorizes reminder sends.
- Staff can prepare reminders and request previews.
- Read-only can view dispatch logs.
"""

from typing import List
from datetime import datetime, timezone
import dateutil.parser
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, status
from app.core.constants import ReminderStatus, ReminderType
from app.core.security import require_manager, require_staff_or_manager, require_authenticated
from app.schemas.reminder import (
    ReminderLog,
    ReminderCreate,
    ReminderPreviewRequest,
    ReminderPreviewResponse,
    ReminderSendRequest,
)
from app.schemas.common import APIResponse
from app.services.sheets import sheets_service, parse_sheet_amount
from app.services.customer_service import customer_service
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/reminders", tags=["Reminders"])


def _row_to_reminder(row: dict) -> ReminderLog:
    sent_at_str = str(row.get("sent_at", ""))
    try:
        sent_at = dateutil.parser.parse(sent_at_str) if sent_at_str else None
    except Exception:
        sent_at = None

    status_str = str(row.get("status", "QUEUED")).strip().upper()
    status_val = ReminderStatus(status_str) if status_str in ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"] else ReminderStatus.QUEUED

    type_str = str(row.get("reminder_type", "GENTLE")).strip().upper()
    type_val = ReminderType(type_str) if type_str in ["GENTLE", "FORMAL", "URGENT"] else ReminderType.GENTLE

    dry_run_str = str(row.get("dry_run", "TRUE")).strip().upper()
    dry_run = dry_run_str in ["TRUE", "1", "YES", "DRY_RUN"]

    cust_id = str(row.get("customer_id", "")).strip()
    phone = str(row.get("phone", "")).strip()
    if not phone and cust_id:
        cust = customer_service.get_customer(cust_id)
        if cust:
            phone = cust.phone

    return ReminderLog(
        id=str(row.get("id", "")).strip(),
        customer_id=cust_id,
        phone=phone or "+923000000000",
        reminder_type=type_val,
        amount_due=parse_sheet_amount(row.get("amount_due")),
        message_text=str(row.get("message_text_ur", "")).strip(),
        message_text_ur=str(row.get("message_text_ur", "")).strip(),
        status=status_val,
        whatsapp_message_id=str(row.get("wamid", "")).strip() or None,
        sent_at=sent_at,
        error_message=str(row.get("error_message", "")).strip() or None,
        dry_run=dry_run,
    )


@router.get("", response_model=APIResponse[List[ReminderLog]])
def list_reminders(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[List[ReminderLog]]:
    """List recovery reminder records and dispatch logs."""
    rows = sheets_service.read_records("ReminderLog")
    reminders = [_row_to_reminder(r) for r in rows if r.get("id")]
    return APIResponse(data=reminders)


@router.post("/preview", response_model=APIResponse[ReminderPreviewResponse])
def preview_reminder(
    payload: ReminderPreviewRequest,
    current_user: dict = Depends(require_staff_or_manager),
) -> APIResponse[ReminderPreviewResponse]:
    """
    Generate an authoritative reminder preview with template parameters,
    customer consent status, and duplicate-send warning.
    Staff and Manager permitted to prepare previews.
    """
    try:
        preview = whatsapp_service.generate_reminder_preview(
            customer_id=payload.customer_id,
            override_cooldown=payload.override_cooldown,
        )
        return APIResponse(
            message="Reminder preview generated successfully",
            message_ur="یاددہانی کا پیش نظارہ کامیابی سے تیار کر لیا گیا",
            data=ReminderPreviewResponse(**preview),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/send", response_model=APIResponse[ReminderLog])
def send_reminder(
    payload: ReminderSendRequest,
    manager: dict = Depends(require_manager),
) -> APIResponse[ReminderLog]:
    """
    Dispatch an approved WhatsApp reminder after manager authorization.
    In DRY_RUN mode, simulates sending; in LIVE mode, invokes Meta Cloud API.
    Strictly requires MANAGER role (Muhammad Asad).
    """
    try:
        result = whatsapp_service.send_approved_reminder(
            customer_id=payload.customer_id,
            reminder_type=payload.reminder_type,
            override_cooldown=payload.override_cooldown,
            notes=payload.notes,
        )

        rows = sheets_service.read_records("ReminderLog")
        created_row = next((r for r in rows if r.get("id") == result["reminder_id"]), {})
        reminder_obj = _row_to_reminder(created_row) if created_row else ReminderLog(
            id=result["reminder_id"],
            customer_id=result["customer_id"],
            phone=result["phone"],
            reminder_type=payload.reminder_type,
            amount_due=result["amount_due"],
            message_text="WhatsApp reminder",
            message_text_ur="واٹس ایپ وصولی یاددہانی",
            status=result["status"],
            whatsapp_message_id=result["wamid"],
            sent_at=result["sent_at"],
            dry_run=result["dry_run"],
        )

        mode_msg = "ٹیسٹ موڈ (Dry-run)" if result["dry_run"] else "براہ راست (Live)"
        return APIResponse(
            message=f"Reminder dispatched successfully [{mode_msg}]",
            message_ur=f"یاددہانی کامیابی کے ساتھ بھیج دی گئی [{mode_msg}]",
            data=reminder_obj,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.post("", response_model=APIResponse[ReminderLog], status_code=status.HTTP_201_CREATED)
def queue_reminder(
    payload: ReminderCreate,
    current_user: dict = Depends(require_staff_or_manager),
) -> APIResponse[ReminderLog]:
    """Queue a recovery reminder record directly into sheet log."""
    customer = customer_service.get_customer(payload.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer '{payload.customer_id}' does not exist.",
        )

    existing_rows = sheets_service.read_records("ReminderLog")
    rem_id = payload.id
    if not rem_id:
        existing_nums = [
            int(r["id"].split("-")[1])
            for r in existing_rows
            if r.get("id", "").startswith("REM-") and r.get("id", "").split("-")[1].isdigit()
        ]
        next_num = max(existing_nums, default=0) + 1
        rem_id = f"REM-{next_num:03d}"

    now = datetime.now(timezone.utc)
    new_reminder = ReminderLog(
        id=rem_id,
        customer_id=payload.customer_id,
        phone=payload.phone,
        reminder_type=payload.reminder_type,
        amount_due=payload.amount_due,
        message_text=payload.message_text,
        message_text_ur=payload.message_text_ur,
        status=ReminderStatus.QUEUED,
        queued_at=now,
        dry_run=True,
    )

    sheet_record = {
        "id": new_reminder.id,
        "customer_id": new_reminder.customer_id,
        "phone": new_reminder.phone,
        "reminder_type": new_reminder.reminder_type.value,
        "amount_due": str(new_reminder.amount_due),
        "message_text_ur": new_reminder.message_text_ur,
        "status": new_reminder.status.value,
        "wamid": "",
        "sent_at": "",
        "dry_run": "TRUE",
    }
    sheets_service.append_record("ReminderLog", sheet_record)

    return APIResponse(
        message="Reminder queued in dry-run mode",
        message_ur="یاددہانی ٹیسٹ موڈ میں کامیابی کے ساتھ تیار کر لی گئی",
        data=new_reminder,
    )
