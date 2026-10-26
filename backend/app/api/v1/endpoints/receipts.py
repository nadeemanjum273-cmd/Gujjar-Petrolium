"""
Receipt Queue Endpoints for Gujjar Petrolium Kot Gujjran.
Complete Receipt Approval Lifecycle:
PENDING_VERIFICATION -> APPROVED or REJECTED.
Enforces Manager authorization, bank reference deduplication, idempotent approval,
and zero ledger balance impact upon rejection.
"""

from typing import List, Optional
from datetime import datetime, timezone
import dateutil.parser
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, status

from app.core.constants import ReceiptStatus, TransactionType, TransactionStatus, AuditAction, UserRole
from app.core.security import require_manager, require_authenticated, get_current_user
from app.schemas.receipt import ReceiptQueue, ReceiptCreate, ReceiptVerification
from app.schemas.transaction import TransactionCreate
from app.schemas.common import APIResponse
from app.services.sheets import sheets_service, parse_sheet_amount
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/receipts", tags=["Receipts"])


def _row_to_receipt(row: dict) -> ReceiptQueue:
    submitted_at_str = str(row.get("payment_date", "") or row.get("created_at", ""))
    try:
        submitted_at = dateutil.parser.parse(submitted_at_str) if submitted_at_str else datetime.now(timezone.utc)
    except Exception:
        submitted_at = datetime.now(timezone.utc)

    verified_at_str = str(row.get("verified_at", ""))
    try:
        verified_at = dateutil.parser.parse(verified_at_str) if verified_at_str else None
    except Exception:
        verified_at = None

    status_str = str(row.get("status", "PENDING_VERIFICATION")).strip().upper()
    status_val = ReceiptStatus(status_str) if status_str in ["PENDING_VERIFICATION", "APPROVED", "REJECTED"] else ReceiptStatus.PENDING_VERIFICATION

    return ReceiptQueue(
        id=str(row.get("id", "")).strip(),
        customer_id=str(row.get("customer_id", "")).strip(),
        claimed_amount=parse_sheet_amount(row.get("claimed_amount")),
        payment_date=submitted_at,
        channel=str(row.get("channel", "")).strip() or None,
        transaction_reference=str(row.get("transaction_reference", "")).strip() or None,
        receipt_image_url=str(row.get("receipt_image_url", "")).strip() or None,
        notes=str(row.get("notes", "")).strip() or None,
        status=status_val,
        submitted_at=submitted_at,
        verified_by=str(row.get("verified_by", "")).strip() or None,
        verified_at=verified_at,
        verification_notes=str(row.get("decision_note", "") or row.get("verification_notes", "")).strip() or None,
        rejection_reason=str(row.get("rejection_reason", "")).strip() or None,
        resulting_transaction_id=str(row.get("resulting_txn_id", "")).strip() or None,
    )


@router.get("", response_model=APIResponse[List[ReceiptQueue]])
def list_receipts(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[List[ReceiptQueue]]:
    """List payment claims awaiting verification or processed."""
    rows = sheets_service.read_records("ReceiptQueue")
    receipts = [_row_to_receipt(r) for r in rows if r.get("id")]
    return APIResponse(data=receipts)


@router.post("", response_model=APIResponse[ReceiptQueue], status_code=status.HTTP_201_CREATED)
def submit_receipt(
    payload: ReceiptCreate,
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[ReceiptQueue]:
    """Submit an unverified receipt claim for manager verification."""
    customer = customer_service.get_customer(payload.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer '{payload.customer_id}' does not exist.",
        )

    if payload.claimed_amount <= Decimal("0"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Receipt claimed amount must be greater than zero.",
        )

    existing_rows = sheets_service.read_records("ReceiptQueue")
    rcpt_id = payload.id
    if not rcpt_id:
        existing_nums = [
            int(r["id"].split("-")[1])
            for r in existing_rows
            if r.get("id", "").startswith("RCPT-") and r.get("id", "").split("-")[1].isdigit()
        ]
        next_num = max(existing_nums, default=0) + 1
        rcpt_id = f"RCPT-{next_num:03d}"
    else:
        # Check duplicate receipt ID
        if any(r.get("id") == rcpt_id for r in existing_rows):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Receipt ID '{rcpt_id}' already exists.",
            )

    # Check duplicate transaction reference if supplied
    if payload.transaction_reference:
        ref = payload.transaction_reference.strip().lower()
        for r in existing_rows:
            if (r.get("transaction_reference") or "").strip().lower() == ref:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Transaction reference '{payload.transaction_reference}' has already been submitted in receipt '{r.get('id')}'.",
                )

    now = datetime.now(timezone.utc)
    new_rcpt = ReceiptQueue(
        id=rcpt_id,
        customer_id=payload.customer_id,
        claimed_amount=payload.claimed_amount,
        payment_date=payload.payment_date or now,
        channel=payload.channel,
        transaction_reference=payload.transaction_reference,
        receipt_image_url=payload.receipt_image_url,
        notes=payload.notes,
        status=ReceiptStatus.PENDING_VERIFICATION,
        submitted_at=now,
    )

    sheet_record = {
        "id": new_rcpt.id,
        "customer_id": new_rcpt.customer_id,
        "claimed_amount": str(new_rcpt.claimed_amount),
        "payment_date": new_rcpt.payment_date.isoformat(),
        "channel": new_rcpt.channel or "",
        "transaction_reference": new_rcpt.transaction_reference or "",
        "receipt_image_url": new_rcpt.receipt_image_url or "",
        "status": new_rcpt.status.value,
        "verified_by": "",
        "verified_at": "",
        "resulting_txn_id": "",
    }
    sheets_service.append_record("ReceiptQueue", sheet_record)

    audit_service.log_event(
        action=AuditAction.CREATE,
        entity_type="RECEIPT",
        entity_id=new_rcpt.id,
        actor_name=current_user.get("name", "Staff"),
        actor_role=current_user.get("role").value if hasattr(current_user.get("role"), "value") else str(current_user.get("role")),
        details=f"Submitted receipt claim {new_rcpt.id} for PKR {new_rcpt.claimed_amount} (Customer: {new_rcpt.customer_id})",
        details_ur=f"گاہک {new_rcpt.customer_id} کیلئے {new_rcpt.claimed_amount} روپے کی نئی رسید جمع کی گئی",
    )

    return APIResponse(
        message="Receipt claim submitted for verification",
        message_ur="ادائیگی کی رسید تصدیق کیلئے جمع کر دی گئی ہے",
        data=new_rcpt,
    )


@router.post("/{receipt_id}/verify", response_model=APIResponse[ReceiptQueue])
def verify_receipt(
    receipt_id: str,
    payload: ReceiptVerification,
    manager: dict = Depends(require_manager),
) -> APIResponse[ReceiptQueue]:
    """
    Approve or reject an unverified payment claim.
    Requires MANAGER role (Muhammad Asad).
    - Idempotent: Repeated approval calls return the existing approved transaction.
    - APPROVED: Exactly one approved PAYMENT transaction is appended to the ledger.
    - REJECTED: Retains receipt audit record, ledger balance remains completely unchanged.
    """
    rows = sheets_service.read_records("ReceiptQueue")
    target_row = next((r for r in rows if r.get("id") == receipt_id), None)
    if not target_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Receipt '{receipt_id}' was not found.",
        )

    receipt = _row_to_receipt(target_row)
    now = datetime.now(timezone.utc)

    # Idempotency check: Already approved
    if receipt.status == ReceiptStatus.APPROVED:
        if payload.status == ReceiptStatus.APPROVED:
            # Idempotent return without duplicate transaction
            return APIResponse(
                message="Receipt already approved (idempotent response).",
                message_ur="یہ رسید پہلے ہی منظور ہو چکی ہے۔",
                data=receipt,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject a receipt that has already been approved and credited to ledger.",
            )

    # Idempotency check: Already rejected
    if receipt.status == ReceiptStatus.REJECTED:
        if payload.status == ReceiptStatus.REJECTED:
            return APIResponse(
                message="Receipt already rejected (idempotent response).",
                message_ur="یہ رسید پہلے ہی مسترد کی جا چکی ہے۔",
                data=receipt,
            )
        # Note: If manager wants to reconsider, we verify customer exists before approving
        pass

    # Verify customer still exists
    customer = customer_service.get_customer(receipt.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated customer '{receipt.customer_id}' does not exist.",
        )

    resulting_txn_id = receipt.resulting_transaction_id

    if payload.status == ReceiptStatus.APPROVED:
        # Check if transaction reference is already used elsewhere in Transactions
        if receipt.transaction_reference:
            existing_txns = sheets_service.read_records("Transactions")
            ref_clean = receipt.transaction_reference.strip().lower()
            for t in existing_txns:
                t_ref = (t.get("slip_number") or "").strip().lower()
                if t_ref == ref_clean and t.get("id") != resulting_txn_id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Bank reference '{receipt.transaction_reference}' is already used by ledger transaction '{t.get('id')}'. Possible duplicate payment.",
                    )

        # Create authoritative approved PAYMENT transaction
        txn_data = TransactionCreate(
            customer_id=receipt.customer_id,
            type=TransactionType.PAYMENT,
            amount=receipt.claimed_amount,
            description=f"Verified payment via {receipt.channel or 'Bank'} (Ref: {receipt.transaction_reference or receipt.id}) - Note: {payload.verification_notes or 'Verified by Manager'}",
            slip_number=receipt.transaction_reference or receipt.id,
            idempotency_key=f"receipt-approved-{receipt.id}",
        )
        created_txn = ledger_service.create_transaction(
            txn_data,
            actor_name=manager.get("name", "Muhammad Asad"),
            actor_role="MANAGER",
        )
        resulting_txn_id = created_txn.id

    # Update receipt status in Google Sheets
    sheets_service.update_cell_by_id("ReceiptQueue", receipt_id, "status", payload.status.value)
    sheets_service.update_cell_by_id("ReceiptQueue", receipt_id, "verified_by", manager.get("name", "Muhammad Asad"))
    sheets_service.update_cell_by_id("ReceiptQueue", receipt_id, "verified_at", now.isoformat())
    if resulting_txn_id:
        sheets_service.update_cell_by_id("ReceiptQueue", receipt_id, "resulting_txn_id", resulting_txn_id)

    # Audit Trail
    audit_service.log_event(
        action=AuditAction.APPROVE if payload.status == ReceiptStatus.APPROVED else AuditAction.REJECT,
        entity_type="RECEIPT",
        entity_id=receipt_id,
        actor_name=manager.get("name", "Muhammad Asad"),
        actor_role="MANAGER",
        details=f"Manager {manager.get('name')} {payload.status.value} receipt {receipt_id} for PKR {receipt.claimed_amount}. Notes: {payload.verification_notes or 'None'}",
        details_ur=f"منیجر {manager.get('name')} نے رسید {receipt_id} ({receipt.claimed_amount} روپے) کو {payload.status.value} کیا۔",
        metadata={
            "status": payload.status.value,
            "resulting_transaction_id": resulting_txn_id,
            "claimed_amount": str(receipt.claimed_amount),
            "verification_notes": payload.verification_notes,
        },
    )

    receipt.status = payload.status
    receipt.verified_by = manager.get("name", "Muhammad Asad")
    receipt.verified_at = now
    receipt.verification_notes = payload.verification_notes
    receipt.resulting_transaction_id = resulting_txn_id

    return APIResponse(
        message=f"Receipt {payload.status.value.lower()} successfully",
        message_ur="رسید کا فیصلہ کامیابی سے محفوظ ہو گیا",
        data=receipt,
    )
