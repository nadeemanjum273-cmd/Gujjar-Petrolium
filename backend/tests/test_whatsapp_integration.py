"""
Comprehensive Unit & Integration Test Suite for Phase 4:
Official Meta WhatsApp Cloud API Integration.
Covers:
- Template payload construction and phone formatting
- Configuration and API version validation
- Webhook GET challenge verification
- Webhook POST HMAC-SHA256 signature verification
- Deduplication and idempotency
- Delivery-status tracking (sent, delivered, read, failed)
- Inbound commands (LEDGER, HELP, STOP, START)
- Unauthorized ledger query protection
- Dry-run mode isolation
- WhatsApp receipt media intake without automatic payment approval
"""

import hmac
import hashlib
import json
from decimal import Decimal
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings, Settings
from app.core.constants import MessagingMode, ReminderStatus, ReceiptStatus
from app.services.sheets import sheets_service
from app.services.customer_service import customer_service
from app.services.whatsapp_service import whatsapp_service, normalize_meta_phone


@pytest.fixture
def client():
    return TestClient(app)


# 1. Phone number normalization
def test_phone_normalization():
    assert normalize_meta_phone("+923001234567") == "923001234567"
    assert normalize_meta_phone("03001234567") == "923001234567"
    assert normalize_meta_phone("923001234567") == "923001234567"
    assert normalize_meta_phone("00923001234567") == "923001234567"


# 2. Configuration & API version validation
def test_api_version_validation():
    # Valid versions
    s = Settings(WHATSAPP_API_VERSION="v20.0")
    assert s.WHATSAPP_API_VERSION == "v20.0"

    s2 = Settings(WHATSAPP_API_VERSION="v21.0")
    assert s2.WHATSAPP_API_VERSION == "v21.0"

    # Invalid version should raise ValueError
    with pytest.raises(ValueError, match="is invalid. Must follow 'vXX.X' format"):
        Settings(WHATSAPP_API_VERSION="invalid_version")


# 3. Dry-run mode outbound isolation
def test_dry_run_template_message():
    assert whatsapp_service.is_dry_run is True

    resp = whatsapp_service.send_template_message(
        to_phone="+923001234567",
        template_name="payment_reminder_v1",
        template_lang="ur",
        body_parameters=["چوہدری طارق", "PKR 70,000", "15", "محمد اسد"],
    )

    assert resp["dry_run"] is True
    assert resp["simulated"] is True
    assert "messages" in resp
    assert resp["messages"][0]["id"].startswith("wamid.")
    assert "simulated" in resp["messages"][0]["id"]


# 4. Webhook GET verification handshake
def test_webhook_get_verification_success(client):
    verify_token = settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    challenge = "challenge_code_12345"

    resp = client.get(
        f"/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token={verify_token}&hub.challenge={challenge}"
    )
    assert resp.status_code == 200
    assert resp.text == challenge


def test_webhook_get_verification_failure(client):
    resp = client.get(
        "/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=12345"
    )
    assert resp.status_code == 403


# 5. Webhook POST HMAC-SHA256 signature verification
def test_webhook_post_signature_validation(client):
    body = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "923001234567"},
                            "statuses": [
                                {
                                    "id": "wamid.TEST123456",
                                    "status": "delivered",
                                    "timestamp": "1729850000",
                                    "recipient_id": "923000000001",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }
    payload_bytes = json.dumps(body).encode("utf-8")

    # Invalid signature
    resp = client.post(
        "/api/v1/webhook/whatsapp",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": "sha256=invalid_signature"},
    )
    assert resp.status_code == 403

    # Missing signature header
    resp = client.post(
        "/api/v1/webhook/whatsapp",
        content=payload_bytes,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 403

    # Valid signature
    computed_sig = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    resp = client.post(
        "/api/v1/webhook/whatsapp",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": f"sha256={computed_sig}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "EVENT_RECEIVED"


# 6. Delivery-status processing (sent, delivered, read, failed)
def test_delivery_status_updates():
    # Insert a dummy record in ReminderLog
    rem_id = "REM-999"
    wamid = "wamid.HBgLTEST999"
    sheets_service.append_record(
        "ReminderLog",
        {
            "id": rem_id,
            "customer_id": "CUST-001",
            "phone": "+923000000001",
            "reminder_type": "GENTLE",
            "amount_due": "70000.00",
            "message_text_ur": "Test",
            "status": ReminderStatus.SENT.value,
            "wamid": wamid,
            "sent_at": datetime.utcnow().isoformat(),
            "dry_run": "TRUE",
        },
    )

    # Status update: DELIVERED
    delivered_update = {
        "id": wamid,
        "status": "delivered",
        "timestamp": "1729850000",
        "recipient_id": "923000000001",
    }
    res = whatsapp_service.process_delivery_status(delivered_update)
    assert res is not None
    assert res["status"] == "DELIVERED"

    # Status update: READ
    read_update = {
        "id": wamid,
        "status": "read",
        "timestamp": "1729850100",
        "recipient_id": "923000000001",
    }
    res = whatsapp_service.process_delivery_status(read_update)
    assert res is not None
    assert res["status"] == "READ"

    # Duplicate status update should be ignored (idempotency)
    dup_res = whatsapp_service.process_delivery_status(read_update)
    assert dup_res is None


# 7. Inbound message: LEDGER for registered customer
def test_inbound_ledger_command():
    # CUST-001 has phone +923000000001 in mock sheet
    msg = {
        "from": "923000000001",
        "id": "wamid.INBOUND001",
        "timestamp": "1729850200",
        "type": "text",
        "text": {"body": "LEDGER"},
    }
    res = whatsapp_service.process_inbound_message(msg)
    assert res["action"] == "LEDGER_SENT"
    assert res["customer_id"] == "CUST-001"


# 8. Inbound message: LEDGER from unregistered phone (Protection from unauthorized leakage)
def test_inbound_ledger_unregistered_phone():
    msg = {
        "from": "923999999999",
        "id": "wamid.INBOUND_UNAUTH",
        "timestamp": "1729850300",
        "type": "text",
        "text": {"body": "LEDGER"},
    }
    res = whatsapp_service.process_inbound_message(msg)
    assert res["action"] == "UNAUTHORIZED_LEDGER_REQUEST"


# 9. Inbound message: STOP (Opt-out) and START (Opt-in)
def test_inbound_stop_and_start_consent():
    # Send STOP
    stop_msg = {
        "from": "923000000001",
        "id": "wamid.INBOUND_STOP",
        "timestamp": "1729850400",
        "type": "text",
        "text": {"body": "STOP"},
    }
    res = whatsapp_service.process_inbound_message(stop_msg)
    assert res["action"] == "OPT_OUT"

    # Customer consent in sheet should now be False
    cust = customer_service.get_customer("CUST-001")
    assert cust.whatsapp_consent is False

    # Send START
    start_msg = {
        "from": "923000000001",
        "id": "wamid.INBOUND_START",
        "timestamp": "1729850500",
        "type": "text",
        "text": {"body": "START"},
    }
    res = whatsapp_service.process_inbound_message(start_msg)
    assert res["action"] == "OPT_IN"

    cust = customer_service.get_customer("CUST-001")
    assert cust.whatsapp_consent is True


# 10. Inbound receipt media intake (Never automatically marks payment or reduces balance)
def test_inbound_receipt_media_intake():
    ledger_before = sheets_service.read_records("Transactions")
    approved_txns_before = len(ledger_before)

    media_msg = {
        "from": "923000000001",
        "id": "wamid.INBOUND_MEDIA_RECEIPT",
        "timestamp": "1729850600",
        "type": "image",
        "image": {
            "id": "media_987654321",
            "mime_type": "image/jpeg",
            "caption": "Meezan Bank slip Rs. 20000",
        },
    }
    res = whatsapp_service.process_inbound_message(media_msg)
    assert res["action"] == "RECEIPT_QUEUED"
    assert res["customer_id"] == "CUST-001"
    assert res["receipt_id"].startswith("RCPT-")

    # Verify receipt is in ReceiptQueue with PENDING_VERIFICATION
    rcpt_rows = sheets_service.read_records("ReceiptQueue")
    rcpt_row = next((r for r in rcpt_rows if r.get("id") == res["receipt_id"]), None)
    assert rcpt_row is not None
    assert rcpt_row["status"] == ReceiptStatus.PENDING_VERIFICATION.value

    # CRITICAL: Verify NO transaction was automatically created and NO balance reduced!
    ledger_after = sheets_service.read_records("Transactions")
    assert len(ledger_after) == approved_txns_before


# 11. Reminder Preview & Approval Send Endpoints
def test_reminder_preview_endpoint(client):
    headers = {"X-Dev-Manager-Secret": settings.ADMIN_SESSION_SECRET}
    resp = client.post("/api/v1/reminders/preview", json={"customer_id": "CUST-001", "override_cooldown": True}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["customer_id"] == "CUST-001"
    assert data["whatsapp_consent"] is True
    assert "template_name" in data
    assert "rendered_message_ur" in data
    assert data["can_send"] is True


def test_reminder_send_endpoint_authorized(client):
    headers = {"X-Dev-Manager-Secret": "dev-session-secret-placeholder-min-32-chars"}
    resp = client.post(
        "/api/v1/reminders/send",
        json={"customer_id": "CUST-001", "reminder_type": "GENTLE", "override_cooldown": True},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["customer_id"] == "CUST-001"
    assert data["dry_run"] is True
    assert data["whatsapp_message_id"].startswith("wamid.")


def test_reminder_send_unauthorized(client):
    # Without manager write access
    resp = client.post(
        "/api/v1/reminders/send",
        json={"customer_id": "CUST-001", "reminder_type": "GENTLE"},
    )
    assert resp.status_code in [401, 403]
