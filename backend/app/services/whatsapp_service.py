"""
Official Meta WhatsApp Cloud API Service for Gujjar Petrolium Kot Gujjran.
Implements reminder dispatch, approved templates, inbound message parsing,
webhook signature verification, delivery tracking, and safe dry-run simulation.
Official Meta Graph API Documentation Reference:
- Cloud API Messages: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
- Webhooks: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
"""

import hmac
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.config import settings
from app.core.constants import MessagingMode, ReminderStatus, ReminderType, ReceiptStatus, AuditAction
from app.services.sheets import sheets_service, parse_sheet_amount
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service

logger = logging.getLogger(__name__)


def normalize_meta_phone(phone: str) -> str:
    """
    Format phone number to standard Meta WhatsApp format (digits only with country code, no '+').
    e.g. '+923001234567' -> '923001234567'
    e.g. '03001234567' -> '923001234567'
    """
    digits = "".join(filter(str.isdigit, phone))
    if digits.startswith("0") and len(digits) == 11:
        digits = "92" + digits[1:]
    elif digits.startswith("0092"):
        digits = "92" + digits[4:]
    return digits


class WhatsAppService:
    """
    Production-ready Meta WhatsApp Cloud API Service.
    Guarantees strict isolation in DRY_RUN mode and bounded retries in LIVE mode.
    """

    def __init__(self):
        self._processed_events: set = set()
        self._max_event_cache_size = 5000

        # Configure resilient HTTP session for live mode
        self._session = requests.Session()
        retries = Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"],
            raise_on_status=False,
        )
        self._session.mount("https://", HTTPAdapter(max_retries=retries))

    @property
    def api_url(self) -> str:
        return f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"

    @property
    def is_dry_run(self) -> bool:
        return settings.MESSAGING_MODE == MessagingMode.DRY_RUN

    # =========================================================================
    # Webhook Verification & Security
    # =========================================================================

    def verify_webhook_token(self, mode: Optional[str], token: Optional[str], challenge: Optional[str]) -> Optional[str]:
        """
        Validates Meta's GET Webhook Challenge according to official docs.
        Returns the challenge string if valid, None if invalid.
        """
        if mode == "subscribe" and token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
            logger.info("Meta Webhook verification succeeded")
            return challenge
        logger.warning("Meta Webhook verification failed: invalid token or mode")
        return None

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """
        Verifies HMAC-SHA256 signature from Meta (X-Hub-Signature-256).
        Protects against spoofed incoming webhook requests.
        """
        if not signature_header:
            return False

        if not signature_header.startswith("sha256="):
            return False

        expected_sig = signature_header.split("sha256=", 1)[1].strip()
        computed_sig = hmac.new(
            settings.META_APP_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, computed_sig)

    def is_event_duplicate(self, event_id: str) -> bool:
        """
        Check if webhook event (message_id or status_id) has already been processed.
        Maintains an in-memory sliding cache.
        """
        if not event_id:
            return False
        if event_id in self._processed_events:
            return True

        if len(self._processed_events) >= self._max_event_cache_size:
            # Clear half to prevent unbounded memory growth
            self._processed_events = set(list(self._processed_events)[len(self._processed_events) // 2:])

        self._processed_events.add(event_id)
        return False

    # =========================================================================
    # Outbound Message Sending
    # =========================================================================

    def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        template_lang: str,
        body_parameters: List[str],
    ) -> Dict[str, Any]:
        """
        Sends an approved Meta WhatsApp Message Template.
        In DRY_RUN mode, generates a simulated delivery response without making network calls.
        """
        formatted_phone = normalize_meta_phone(to_phone)
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": template_lang},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": str(p)} for p in body_parameters],
                    }
                ],
            },
        }

        if self.is_dry_run:
            simulated_wamid = f"wamid.HBgL{uuid.uuid4().hex[:16]}simulated"
            logger.info("DRY_RUN: Simulated template '%s' sent to %s (wamid: %s)", template_name, formatted_phone, simulated_wamid)
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": formatted_phone, "wa_id": formatted_phone}],
                "messages": [{"id": simulated_wamid}],
                "dry_run": True,
                "simulated": True,
            }

        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        try:
            resp = self._session.post(self.api_url, json=payload, headers=headers, timeout=10.0)
            data = resp.json()

            if resp.status_code >= 400:
                err_msg = data.get("error", {}).get("message", f"Meta API HTTP {resp.status_code}")
                logger.error("Meta API Error (%d): %s", resp.status_code, err_msg)
                raise RuntimeError(f"Meta API Error: {err_msg}")

            data["dry_run"] = False
            return data
        except requests.exceptions.RequestException as exc:
            logger.error("Network error while connecting to Meta WhatsApp API: %s", exc)
            raise RuntimeError(f"Failed to communicate with Meta Cloud API: {str(exc)}")

    def send_session_reply(self, to_phone: str, message_text: str) -> Dict[str, Any]:
        """
        Sends a free-form customer service reply within the allowed 24-hour service window.
        """
        formatted_phone = normalize_meta_phone(to_phone)
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_text,
            },
        }

        if self.is_dry_run:
            simulated_wamid = f"wamid.HBgL{uuid.uuid4().hex[:16]}simulated"
            logger.info("DRY_RUN: Simulated session text sent to %s (wamid: %s)", formatted_phone, simulated_wamid)
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": formatted_phone, "wa_id": formatted_phone}],
                "messages": [{"id": simulated_wamid}],
                "dry_run": True,
                "simulated": True,
            }

        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        try:
            resp = self._session.post(self.api_url, json=payload, headers=headers, timeout=10.0)
            data = resp.json()

            if resp.status_code >= 400:
                err_msg = data.get("error", {}).get("message", f"Meta API HTTP {resp.status_code}")
                logger.error("Meta API Error (%d): %s", resp.status_code, err_msg)
                raise RuntimeError(f"Meta API Error: {err_msg}")

            data["dry_run"] = False
            return data
        except requests.exceptions.RequestException as exc:
            logger.error("Network error sending WhatsApp reply: %s", exc)
            raise RuntimeError(f"Failed to send session reply: {str(exc)}")

    # =========================================================================
    # Reminder Workflow Engine
    # =========================================================================

    def generate_reminder_preview(self, customer_id: str, override_cooldown: bool = False) -> Dict[str, Any]:
        """
        Generates full reminder preview including financial validation, WhatsApp consent check,
        and duplicate-send cooldown enforcement.
        """
        customer = customer_service.get_customer(customer_id)
        if not customer:
            raise ValueError(f"Customer '{customer_id}' does not exist.")

        ledger = ledger_service.get_customer_ledger(customer_id)
        current_balance = ledger.outstanding_balance
        days_overdue = ledger.days_overdue
        oldest_unpaid_date = str(ledger.oldest_unpaid_date) if ledger.oldest_unpaid_date else None

        can_send = True
        rejection_reasons = []

        # Consent check
        if not customer.whatsapp_consent:
            can_send = False
            rejection_reasons.append("گاہک نے واٹس ایپ پر اطلاعات موصول کرنے کی رضامندی (Consent) نہیں دی ہے۔")

        # Balance check
        if current_balance <= Decimal("0"):
            can_send = False
            rejection_reasons.append("کسٹمر کے ذمے کوئی بقایا رقم نہیں ہے۔")

        # Cooldown check
        reminder_rows = sheets_service.read_records("ReminderLog")
        cust_reminders = [r for r in reminder_rows if str(r.get("customer_id")).strip() == customer_id]

        duplicate_warning = False
        last_reminder_at = None
        cooldown_days = settings.WHATSAPP_COOLDOWN_DAYS

        if cust_reminders:
            # Check latest reminder date
            latest_rem = cust_reminders[-1]
            sent_str = latest_rem.get("sent_at") or latest_rem.get("queued_at")
            if sent_str:
                try:
                    import dateutil.parser
                    last_reminder_at = dateutil.parser.parse(sent_str)
                    days_since = (datetime.utcnow() - last_reminder_at.replace(tzinfo=None)).days
                    if days_since < cooldown_days:
                        duplicate_warning = True
                        if not override_cooldown:
                            can_send = False
                            rejection_reasons.append(
                                f"گزشتہ ریمائنڈر {days_since} دن قبل بھیجا جا چکا ہے۔ کول ڈاؤن کی مدت {cooldown_days} دن ہے۔"
                            )
                except Exception:
                    pass

        # Format Urdu and English messages
        cust_name_display = customer.name_ur or customer.name
        bal_str = f"PKR {current_balance:,.2f}"

        rendered_message_ur = (
            f"محترم جناب {cust_name_display} صاحب،\n"
            f"گجر پیٹرولیم کوٹ گجراں کے کھاتے کے مطابق آپ کا واجب الادا بقایا {bal_str} ہے "
            f"جو کہ پچھلے {days_overdue} دنوں سے زیرِ التواء ہے۔\n"
            f"برائے مہربانی اپنا کھاتہ جلد از جلد کلیئر فرمائیں۔\n"
            f"شکریہ۔\n"
            f"{settings.MANAGER_NAME} (مجاز منیجر) — {settings.BUSINESS_NAME_UR}"
        )

        rendered_message_en = (
            f"Dear {customer.name}, your outstanding balance at Gujjar Petrolium Kot Gujjran is {bal_str} "
            f"({days_overdue} days overdue). Kindly arrange payment at your earliest convenience. Thank you."
        )

        template_params = [
            cust_name_display,
            bal_str,
            str(days_overdue),
            settings.MANAGER_NAME,
        ]

        return {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "customer_name_ur": customer.name_ur,
            "phone": customer.phone,
            "current_balance": current_balance,
            "days_overdue": days_overdue,
            "due_date": oldest_unpaid_date,
            "whatsapp_consent": customer.whatsapp_consent,
            "template_name": settings.WHATSAPP_REMINDER_TEMPLATE_NAME,
            "template_lang": settings.WHATSAPP_REMINDER_TEMPLATE_LANG,
            "template_components": template_params,
            "rendered_message_ur": rendered_message_ur,
            "rendered_message_en": rendered_message_en,
            "duplicate_warning": duplicate_warning,
            "last_reminder_at": last_reminder_at,
            "cooldown_days": cooldown_days,
            "can_send": can_send,
            "rejection_reasons": rejection_reasons,
        }

    def send_approved_reminder(
        self,
        customer_id: str,
        reminder_type: ReminderType = ReminderType.GENTLE,
        override_cooldown: bool = False,
        notes: Optional[str] = None,
        actor_name: str = "Muhammad Asad",
    ) -> Dict[str, Any]:
        """
        Dispatches an approved reminder after verifying consent and logging to ReminderLog and AuditLog.
        """
        preview = self.generate_reminder_preview(customer_id, override_cooldown=override_cooldown)

        if not preview["can_send"]:
            reasons = "؛ ".join(preview["rejection_reasons"])
            raise ValueError(f"نہیں بھیجا جا سکتا: {reasons}")

        # Send via WhatsApp Service
        resp = self.send_template_message(
            to_phone=preview["phone"],
            template_name=preview["template_name"],
            template_lang=preview["template_lang"],
            body_parameters=preview["template_components"],
        )

        wamid = resp.get("messages", [{}])[0].get("id", "")
        now = datetime.utcnow()

        # Generate REM ID
        existing_rows = sheets_service.read_records("ReminderLog")
        existing_nums = [
            int(r["id"].split("-")[1])
            for r in existing_rows
            if r.get("id", "").startswith("REM-") and r.get("id", "").split("-")[1].isdigit()
        ]
        next_num = max(existing_nums, default=0) + 1
        rem_id = f"REM-{next_num:03d}"

        # Write to ReminderLog
        sheet_record = {
            "id": rem_id,
            "customer_id": customer_id,
            "phone": preview["phone"],
            "reminder_type": reminder_type.value,
            "amount_due": str(preview["current_balance"]),
            "message_text_ur": preview["rendered_message_ur"],
            "status": ReminderStatus.SENT.value,
            "wamid": wamid,
            "sent_at": now.isoformat(),
            "dry_run": "TRUE" if self.is_dry_run else "FALSE",
        }
        sheets_service.append_record("ReminderLog", sheet_record)

        # Log in AuditLog
        try:
            audit_record = {
                "id": f"AUD-{uuid.uuid4().hex[:8].upper()}",
                "timestamp": now.isoformat(),
                "actor_name": actor_name,
                "actor_role": "MANAGER",
                "action": AuditAction.CREATE.value,
                "entity_type": "REMINDER",
                "entity_id": rem_id,
                "details": f"Sent WhatsApp reminder to {customer_id} ({preview['phone']}) - WAMID: {wamid}",
                "details_ur": f"گاہک {customer_id} کو واٹس ایپ وصولی یاددہانی ارسال کی گئی ({'ٹیسٹ موڈ' if self.is_dry_run else 'براہ راست'})",
            }
            sheets_service.append_record("AuditLog", audit_record)
        except Exception as e:
            logger.warning("Failed to append audit record: %s", e)

        return {
            "reminder_id": rem_id,
            "customer_id": customer_id,
            "phone": preview["phone"],
            "amount_due": preview["current_balance"],
            "wamid": wamid,
            "status": ReminderStatus.SENT,
            "dry_run": self.is_dry_run,
            "sent_at": now,
        }

    # =========================================================================
    # Webhook Processing (Statuses & Inbound Messages)
    # =========================================================================

    def process_delivery_status(self, status_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates delivery status of a previously sent message in ReminderLog.
        Meta statuses: 'sent', 'delivered', 'read', 'failed'.
        """
        wamid = status_payload.get("id")
        if not wamid:
            return None

        # Check deduplication
        event_key = f"status_{wamid}_{status_payload.get('status')}"
        if self.is_event_duplicate(event_key):
            logger.info("Ignoring duplicate status update: %s", event_key)
            return None

        status_str = status_payload.get("status", "").upper()
        meta_status_map = {
            "SENT": ReminderStatus.SENT,
            "DELIVERED": ReminderStatus.DELIVERED,
            "READ": ReminderStatus.READ,
            "FAILED": ReminderStatus.FAILED,
        }
        mapped_status = meta_status_map.get(status_str)
        if not mapped_status:
            return None

        error_message = None
        if mapped_status == ReminderStatus.FAILED:
            errors = status_payload.get("errors", [])
            if errors:
                error_message = errors[0].get("message") or errors[0].get("title")

        # Find row in ReminderLog
        rows = sheets_service.read_records("ReminderLog")
        for idx, row in enumerate(rows):
            if row.get("wamid") == wamid:
                sheets_service.update_cell_by_id("ReminderLog", row["id"], "status", mapped_status.value)
                if mapped_status == ReminderStatus.FAILED and error_message:
                    try:
                        sheets_service.update_cell_by_id("ReminderLog", row["id"], "error_message", error_message)
                    except Exception:
                        pass
                logger.info("Updated ReminderLog %s to status %s", row["id"], mapped_status.value)
                return {"reminder_id": row["id"], "wamid": wamid, "status": mapped_status.value}

        return None

    def process_inbound_message(self, message_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes inbound customer message:
        - LEDGER / کھاتہ: Returns permitted balance information for registered phone only.
        - HELP / مدد: Returns pump contact, location, and banking instructions.
        - STOP / بند: Records opt-out and sets whatsapp_consent = False.
        - START / شروع: Records opt-in and sets whatsapp_consent = True.
        - Media (Images/Documents): Records receipt into ReceiptQueue for manager approval.
        """
        msg_id = message_payload.get("id")
        if self.is_event_duplicate(f"msg_{msg_id}"):
            logger.info("Ignoring duplicate inbound message: %s", msg_id)
            return {"status": "duplicate_ignored"}

        sender_phone = message_payload.get("from", "")
        msg_type = message_payload.get("type", "")

        # Look up customer by phone
        matched_customer = None
        normalized_sender = normalize_meta_phone(sender_phone)
        for cust in customer_service.list_customers():
            cust_phone_norm = normalize_meta_phone(cust.phone)
            if cust_phone_norm and cust_phone_norm == normalized_sender:
                matched_customer = cust
                break

        # Case 1: Media Message (Payment Receipt Slip)
        if msg_type in ["image", "document"]:
            media_info = message_payload.get(msg_type, {})
            media_id = media_info.get("id", "")
            caption = media_info.get("caption", "")

            cust_id = matched_customer.id if matched_customer else f"UNREG-{sender_phone}"

            # Create entry in ReceiptQueue
            existing_rcpts = sheets_service.read_records("ReceiptQueue")
            existing_nums = [
                int(r["id"].split("-")[1])
                for r in existing_rcpts
                if r.get("id", "").startswith("RCPT-") and r.get("id", "").split("-")[1].isdigit()
            ]
            next_num = max(existing_nums, default=0) + 1
            rcpt_id = f"RCPT-{next_num:03d}"

            now_iso = datetime.utcnow().isoformat()
            rcpt_entry = {
                "id": rcpt_id,
                "customer_id": cust_id,
                "claimed_amount": "0.00",  # To be reviewed and entered by manager
                "payment_date": now_iso,
                "channel": "WHATSAPP",
                "transaction_reference": f"WA-MEDIA-{media_id}",
                "receipt_image_url": f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{media_id}",
                "notes": caption or "رسید بذریعہ واٹس ایپ",
                "status": ReceiptStatus.PENDING_VERIFICATION.value,
            }
            sheets_service.append_record("ReceiptQueue", rcpt_entry)

            # Reply to customer
            reply_text = (
                "محترم کسٹمر، آپ کی ادائیگی کی رسید موصول ہو گئی ہے۔ "
                "ہماری انتظامیہ تصدیق کے بعد رقم آپ کے کھاتے میں جمع کر لے گی۔ شکریہ!\n"
                f"— {settings.BUSINESS_NAME_UR}"
            )
            self.send_session_reply(sender_phone, reply_text)

            return {
                "action": "RECEIPT_QUEUED",
                "receipt_id": rcpt_id,
                "customer_id": cust_id,
                "media_id": media_id,
            }

        # Case 2: Text Message
        text_body = message_payload.get("text", {}).get("body", "").strip()
        command = text_body.upper()

        if "LEDGER" in command or "کھاتہ" in command or "بیلنس" in command or "BALANCE" in command:
            if not matched_customer:
                reply = (
                    "معذرت! آپ کا یہ فون نمبر گجر پیٹرولیم کوٹ گجراں کے کسٹمر سسٹم میں رجسٹرڈ نہیں ہے۔ "
                    f"کھاتہ کھولنے کے لیے منیجر {settings.MANAGER_NAME} سے رابطہ کریں۔"
                )
                self.send_session_reply(sender_phone, reply)
                return {"action": "UNAUTHORIZED_LEDGER_REQUEST", "phone": sender_phone}

            cust_id = matched_customer.id
            cust_name = matched_customer.name_ur or matched_customer.name
            ledger = ledger_service.get_customer_ledger(cust_id)
            bal_pkr = f"PKR {ledger.outstanding_balance:,.2f}"
            limit_pkr = f"PKR {ledger.credit_limit:,.2f}"

            reply = (
                f"محترم {cust_name} صاحب،\n"
                f"گجر پیٹرولیم کوٹ گجراں میں آپ کا اکاؤنٹ خلاصہ:\n"
                f"موجودہ بقایا: {bal_pkr}\n"
                f"کریڈٹ کی حد: {limit_pkr}\n"
                f"تاخیر: {ledger.days_overdue} دن\n"
                f"تفصیلی کھاتے کی نقل کے لیے پمپ تشریف لائیں یا رابطہ کریں۔"
            )
            self.send_session_reply(sender_phone, reply)
            return {"action": "LEDGER_SENT", "customer_id": cust_id}

        elif "STOP" in command or "بند" in command or "OPT OUT" in command:
            if matched_customer:
                cust_id = matched_customer.id
                sheets_service.update_cell_by_id("Customers", cust_id, "whatsapp_consent", "FALSE")
                try:
                    sheets_service.append_record("AuditLog", {
                        "id": f"AUD-{uuid.uuid4().hex[:8].upper()}",
                        "timestamp": datetime.utcnow().isoformat(),
                        "actor_name": f"CUSTOMER-{cust_id}",
                        "actor_role": "CUSTOMER",
                        "action": AuditAction.UPDATE.value,
                        "entity_type": "CUSTOMER",
                        "entity_id": cust_id,
                        "details": "Customer opted out of WhatsApp reminders (STOP command)",
                        "details_ur": "کسٹمر نے واٹس ایپ ریمائنڈرز بند کرنے کی درخواست کی (STOP)",
                    })
                except Exception:
                    pass

            reply = (
                "آپ کو واٹس ایپ وصولی ریمائنڈرز کی فہرست سے نکال دیا گیا ہے۔ "
                "دوبارہ فعال کرنے کے لیے کسی بھی وقت 'START' لکھ کر بھیجیں۔ شکریہ!"
            )
            self.send_session_reply(sender_phone, reply)
            return {"action": "OPT_OUT", "phone": sender_phone}

        elif "START" in command or "شروع" in command:
            if matched_customer:
                cust_id = matched_customer.id
                sheets_service.update_cell_by_id("Customers", cust_id, "whatsapp_consent", "TRUE")
                try:
                    sheets_service.append_record("AuditLog", {
                        "id": f"AUD-{uuid.uuid4().hex[:8].upper()}",
                        "timestamp": datetime.utcnow().isoformat(),
                        "actor_name": f"CUSTOMER-{cust_id}",
                        "actor_role": "CUSTOMER",
                        "action": AuditAction.UPDATE.value,
                        "entity_type": "CUSTOMER",
                        "entity_id": cust_id,
                        "details": "Customer opted into WhatsApp notifications (START command)",
                        "details_ur": "کسٹمر نے واٹس ایپ اطلاعات فعال کیں (START)",
                    })
                except Exception:
                    pass

            reply = (
                "خوش آمدید! آپ کے نمبر پر گجر پیٹرولیم کی واٹس ایپ اطلاعات دوبارہ فعال کر دی گئی ہیں۔ شکریہ!"
            )
            self.send_session_reply(sender_phone, reply)
            return {"action": "OPT_IN", "phone": sender_phone}

        else:
            # Default HELP / معلومات
            reply = (
                f"{settings.BUSINESS_NAME_UR}\n"
                f"کھاتہ اور وصولی کسٹمر سروس:\n"
                f"• اپنا کھاتہ دیکھنے کے لیے 'LEDGER' لکھیں\n"
                f"• نوٹیفکیشن بند کرنے کے لیے 'STOP' لکھیں\n"
                f"• رسید بھیجنے کے لیے تصویر ارسال کریں\n"
                f"رابطہ: {settings.MANAGER_NAME} (0300-1234567)\n"
                f"مقام: کوٹ گجراں، پنجاب"
            )
            self.send_session_reply(sender_phone, reply)
            return {"action": "HELP_SENT", "phone": sender_phone}


whatsapp_service = WhatsAppService()
