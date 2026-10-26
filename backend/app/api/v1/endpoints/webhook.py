"""
Meta WhatsApp Cloud API Webhook Ingestion Endpoint for Gujjar Petrolium Kot Gujjran.
Handles GET verification (challenge handshake) and POST events (delivery status and inbound messages).
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, Request, Query, Header, HTTPException, status
from fastapi.responses import PlainTextResponse
from app.services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook/whatsapp", tags=["WhatsApp Webhook"])


@router.get("", response_class=PlainTextResponse)
def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta Webhook Verification endpoint.
    Meta's servers send a GET request when configuring the webhook URL in Meta App Dashboard.
    """
    challenge = whatsapp_service.verify_webhook_token(hub_mode, hub_verify_token, hub_challenge)
    if challenge is not None:
        return PlainTextResponse(content=challenge, status_code=status.HTTP_200_OK)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Webhook verification failed: token or mode mismatch.",
    )


@router.post("")
async def receive_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Meta Webhook Ingestion endpoint.
    Validates HMAC-SHA256 signature, parses event payload, and processes delivery statuses or incoming customer messages.
    """
    payload_bytes = await request.body()

    # Validate HMAC signature
    if not whatsapp_service.verify_webhook_signature(payload_bytes, x_hub_signature_256):
        logger.warning("Rejected webhook POST with invalid signature")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signature validation failed. Untrusted webhook source.",
        )

    try:
        body = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {str(exc)}",
        )

    # Process events
    entries = body.get("entry", [])
    processed_count = 0

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # 1. Delivery status updates
            statuses = value.get("statuses", [])
            for st in statuses:
                whatsapp_service.process_delivery_status(st)
                processed_count += 1

            # 2. Inbound customer messages
            messages = value.get("messages", [])
            for msg in messages:
                whatsapp_service.process_inbound_message(msg)
                processed_count += 1

    return {"status": "EVENT_RECEIVED", "processed_events": processed_count}
