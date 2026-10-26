"""
Google Sheets Service for Gujjar Petrolium Kot Gujjran.
Handles connection, header validation, schema aliasing, row-to-model conversion, and bounded retries.
Supports both the production Google Spreadsheet and an in-memory mock for automated testing.
"""

import time
import os
import re
import json
import logging
import threading
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime

from app.core.config import settings
from app.core.logging import logger
from app.core.constants import (
    CustomerStatus,
    TransactionStatus,
    TransactionType,
    ReceiptStatus,
    ReminderStatus,
    ReminderType,
    AuditAction,
)
from app.schemas.customer import Customer
from app.schemas.transaction import Transaction, AdjustmentDirection
from app.schemas.receipt import ReceiptQueue
from app.schemas.reminder import ReminderLog
from app.schemas.audit import AuditLog
from app.services.sample_data import (
    SAMPLE_CUSTOMERS,
    SAMPLE_TRANSACTIONS,
    SAMPLE_RECEIPTS,
    SAMPLE_REMINDERS,
    SAMPLE_SETTINGS,
    SAMPLE_AUDIT_LOGS,
)

# ------------------------------------------------------------------------------
# Expected Sheet Schemas (Logical Core Columns)
# ------------------------------------------------------------------------------
SHEET_SCHEMAS: Dict[str, List[str]] = {
    "Customers": [
        "id", "name", "phone", "status", "credit_limit",
    ],
    "Transactions": [
        "id", "customer_id", "type", "description", "status",
    ],
    "ReceiptQueue": [
        "id", "customer_id", "claimed_amount", "status",
    ],
    "ReminderLog": [
        "id", "customer_id", "amount_due", "reminder_type", "status", "wamid", "sent_at", "dry_run",
    ],
    "Settings": [
        "key", "value",
    ],
    "AuditLog": [
        "id", "action", "entity_type", "entity_id",
    ],
}

TAB_SPECIFIC_ID_ALIASES: Dict[str, List[str]] = {
    "Customers": ["customer_id", "id", "cust_id"],
    "Transactions": ["transaction_id", "id", "txn_id"],
    "ReceiptQueue": ["receipt_id", "id"],
    "ReminderLog": ["reminder_id", "id"],
    "Settings": ["setting_key", "key"],
    "AuditLog": ["audit_id", "id"],
}

# Column aliases mapping logical field -> possible spreadsheet column headers
COLUMN_ALIASES: Dict[str, List[str]] = {
    "id": ["id"],
    "name": ["name", "full_name", "customer_name"],
    "name_ur": ["name_ur", "customer_name_ur"],
    "phone": ["phone", "phone_e164", "mobile_number", "contact_no", "recipient_phone"],
    "status": ["status", "customer_status", "account_status", "delivery_status", "verification_status"],
    "credit_limit": ["credit_limit", "credit_limit_pkr", "credit_limit_rs"],
    "opening_balance": ["opening_balance", "opening_balance_pkr"],
    "current_balance": ["current_balance", "current_balance_pkr"],
    "vehicles": ["vehicles", "vehicle_numbers", "vehicle_no", "fleet"],
    "address": ["address", "location"],
    "notes": ["notes", "remarks", "description"],
    "created_at": ["created_at", "entry_date"],
    "updated_at": ["updated_at", "modified_at"],
    "whatsapp_consent": ["whatsapp_consent", "wa_consent", "consent"],

    # Transactions
    "customer_id": ["customer_id", "cust_id"],
    "type": ["type", "txn_type", "transaction_type"],
    "amount": ["amount", "amount_pkr", "debit_pkr", "credit_pkr"],
    "debit": ["debit_pkr", "debit", "dr_pkr"],
    "credit": ["credit_pkr", "credit", "cr_pkr"],
    "description": ["description", "particulars", "memo", "details"],
    "transaction_date": ["transaction_date", "txn_date", "date"],
    "fuel_type": ["fuel_type", "item", "product"],
    "liters": ["liters", "litres", "volume_l", "qty"],
    "rate_per_liter": ["rate_per_liter", "unit_rate_pkr", "price_per_liter", "rate"],
    "vehicle_number": ["vehicle_number", "vehicle_no", "plate_no"],
    "slip_number": ["slip_number", "reference", "slip_no", "invoice_no"],
    "adjustment_direction": ["adjustment_direction", "adj_direction"],
    "idempotency_key": ["idempotency_key", "idemp_key", "client_tx_id"],
    "created_by": ["created_by", "entered_by", "operator"],
    "approved_by": ["approved_by", "authorizer"],
    "approved_at": ["approved_at"],

    # ReceiptQueue
    "claimed_amount": ["claimed_amount", "claimed_amount_pkr", "amount"],
    "payment_date": ["payment_date", "received_at", "date"],
    "channel": ["channel", "payment_channel", "media_id", "bank"],
    "transaction_reference": ["transaction_reference", "reference", "tid"],
    "receipt_image_url": ["receipt_image_url", "media_url", "image_url"],
    "verified_by": ["verified_by", "reviewed_by"],
    "verified_at": ["verified_at", "reviewed_at"],
    "resulting_txn_id": ["resulting_txn_id", "payment_transaction_id"],

    # ReminderLog
    "reminder_type": ["reminder_type", "template_name", "type"],
    "amount_due": ["amount_due", "balance_snapshot_pkr", "outstanding_amount"],
    "message_text_ur": ["message_text_ur", "message_text"],
    "wamid": ["wamid", "meta_message_id", "message_id"],
    "sent_at": ["sent_at", "dispatched_at"],
    "dry_run": ["dry_run", "messaging_mode", "is_dry_run"],
    "error_message": ["error_message", "error"],

    # Settings
    "key": ["key", "setting_key", "config_key"],
    "value": ["value", "setting_value", "config_value"],

    # AuditLog
    "timestamp": ["timestamp", "event_time", "created_at"],
    "actor_name": ["actor_name", "actor_id", "user"],
    "actor_role": ["actor_role", "role"],
    "action": ["action", "event_type"],
    "entity_type": ["entity_type", "target_type"],
    "entity_id": ["entity_id", "target_id"],
    "details": ["details", "new_value_summary", "reason"],
    "details_ur": ["details_ur"],
}


def parse_sheet_amount(val: Any) -> Decimal:
    """Safely extracts a Decimal amount from spreadsheet strings like 'PKR 70,000' or 70000."""
    if val is None:
        return Decimal("0.00")
    if isinstance(val, (int, float)):
        return Decimal(str(val)).quantize(Decimal("0.01"))
    s = str(val).strip()
    if not s or s == "-":
        return Decimal("0.00")
    cleaned = re.sub(r"[^\d.-]", "", s)
    if not cleaned or cleaned == "-":
        return Decimal("0.00")
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


class SchemaValidationError(Exception):
    """Raised when a required worksheet tab or header is missing or corrupted."""
    pass


class GoogleSheetsAPIError(Exception):
    """Raised on unrecoverable Google Sheets API communication failures."""
    pass


# ------------------------------------------------------------------------------
# Mock Worksheet & Spreadsheet for Safe Local Dev and Automated Testing
# ------------------------------------------------------------------------------
class MockWorksheet:
    def __init__(self, title: str, headers: List[str], initial_rows: Optional[List[List[Any]]] = None):
        self.title = title
        self.headers = list(headers)
        self.rows: List[List[Any]] = [list(headers)]
        if initial_rows:
            self.rows.extend(initial_rows)

    def get_all_values(self) -> List[List[str]]:
        return [[str(c) if c is not None else "" for c in row] for row in self.rows]

    def row_values(self, row_index: int) -> List[str]:
        if 1 <= row_index <= len(self.rows):
            return [str(c) if c is not None else "" for c in self.rows[row_index - 1]]
        return []

    def append_row(self, values: List[Any], value_input_option: str = "USER_ENTERED"):
        self.rows.append(values)

    def update_cell(self, row: int, col: int, value: Any):
        if row <= 0 or row > len(self.rows):
            raise IndexError(f"Row {row} out of range in sheet '{self.title}'")
        target_row = self.rows[row - 1]
        while len(target_row) < col:
            target_row.append("")
        target_row[col - 1] = str(value)


class MockSpreadsheet:
    def __init__(self):
        self.worksheets_dict: Dict[str, MockWorksheet] = {}
        self._seed_sample_data()

    def _seed_sample_data(self):
        # 1. Customers
        headers_cust = [
            "customer_id", "full_name", "name_ur", "phone_e164", "customer_status",
            "credit_limit_pkr", "opening_balance", "current_balance", "vehicle_numbers",
            "address", "notes", "created_at", "updated_at", "whatsapp_consent",
        ]
        cust_rows = []
        for c in SAMPLE_CUSTOMERS:
            cust_rows.append([
                c.id, c.name, c.name_ur or "", c.phone, c.status.value,
                str(c.credit_limit), str(c.opening_balance), str(c.current_balance),
                ", ".join(c.vehicle_numbers or []), c.address or "", c.notes or "",
                c.created_at.isoformat(), (c.updated_at.isoformat() if c.updated_at else ""),
                "TRUE" if c.whatsapp_consent else "FALSE",
            ])
        self.worksheets_dict["Customers"] = MockWorksheet("Customers", headers_cust, cust_rows)

        # 2. Transactions
        headers_txn = [
            "transaction_id", "idempotency_key", "customer_id", "txn_date", "txn_type",
            "description", "vehicle_no", "litres", "unit_rate_pkr", "debit_pkr", "credit_pkr",
            "status", "reference", "entered_by", "approved_by", "created_at",
        ]
        txn_rows = []
        for t in SAMPLE_TRANSACTIONS:
            debit_pkr = str(t.amount) if t.is_debit else "0"
            credit_pkr = str(t.amount) if t.is_credit else "0"
            txn_rows.append([
                t.id, t.idempotency_key or "", t.customer_id, t.transaction_date.isoformat(),
                t.type.value, t.description, t.vehicle_number or "",
                str(t.liters) if t.liters else "", str(t.rate_per_liter) if t.rate_per_liter else "",
                debit_pkr, credit_pkr, t.status.value, t.slip_number or "",
                t.created_by, t.approved_by or "", t.created_at.isoformat(),
            ])
        self.worksheets_dict["Transactions"] = MockWorksheet("Transactions", headers_txn, txn_rows)

        # 3. ReceiptQueue
        headers_rcpt = [
            "receipt_id", "idempotency_key", "customer_id", "received_at", "media_id",
            "claimed_amount_pkr", "transaction_reference", "verification_status",
            "reviewed_by", "reviewed_at", "payment_transaction_id",
        ]
        rcpt_rows = []
        for r in SAMPLE_RECEIPTS:
            rcpt_rows.append([
                r.id, "", r.customer_id, r.payment_date.isoformat(), r.channel or "",
                str(r.claimed_amount), r.transaction_reference or "", r.status.value,
                r.verified_by or "", r.verified_at.isoformat() if r.verified_at else "",
                r.resulting_transaction_id or "",
            ])
        self.worksheets_dict["ReceiptQueue"] = MockWorksheet("ReceiptQueue", headers_rcpt, rcpt_rows)

        # 4. ReminderLog
        headers_rem = [
            "reminder_id", "idempotency_key", "customer_id", "balance_snapshot_pkr",
            "due_date", "template_name", "scheduled_at", "sent_at", "meta_message_id",
            "delivery_status", "messaging_mode", "error_message", "created_by", "created_at",
        ]
        rem_rows = []
        for rem in SAMPLE_REMINDERS:
            rem_rows.append([
                rem.id, "", rem.customer_id, str(rem.amount_due), "", rem.reminder_type.value,
                rem.queued_at.isoformat(), rem.sent_at.isoformat() if rem.sent_at else "",
                rem.whatsapp_message_id or "", rem.status.value, "DRY_RUN", "",
                "Muhammad Asad", rem.queued_at.isoformat(),
            ])
        self.worksheets_dict["ReminderLog"] = MockWorksheet("ReminderLog", headers_rem, rem_rows)

        # 5. Settings
        setting_rows = [
            ["business_name", SAMPLE_SETTINGS.business_name],
            ["business_name_ur", SAMPLE_SETTINGS.business_name_ur],
            ["manager_name", SAMPLE_SETTINGS.manager_name],
            ["location", SAMPLE_SETTINGS.location],
            ["currency", SAMPLE_SETTINGS.currency],
            ["timezone", SAMPLE_SETTINGS.timezone],
            ["messaging_mode", SAMPLE_SETTINGS.messaging_mode.value],
            ["overdue_threshold_days", str(SAMPLE_SETTINGS.overdue_threshold_days)],
            ["cooldown_days", str(SAMPLE_SETTINGS.cooldown_days_between_reminders)],
            ["contact_phone", SAMPLE_SETTINGS.contact_phone or ""],
        ]
        self.worksheets_dict["Settings"] = MockWorksheet("Settings", ["setting_key", "setting_value"], setting_rows)

        # 6. AuditLog
        headers_aud = ["audit_id", "event_time", "actor_id", "action", "entity_type", "entity_id", "new_value_summary", "details_ur"]
        aud_rows = []
        for a in SAMPLE_AUDIT_LOGS:
            aud_rows.append([
                a.id, a.timestamp.isoformat(), a.actor_name, a.action.value,
                a.entity_type, a.entity_id, a.details, a.details_ur or "",
            ])
        self.worksheets_dict["AuditLog"] = MockWorksheet("AuditLog", headers_aud, aud_rows)

    def worksheets(self) -> List[MockWorksheet]:
        return list(self.worksheets_dict.values())

    def worksheet(self, title: str) -> MockWorksheet:
        if title not in self.worksheets_dict:
            raise KeyError(f"Worksheet '{title}' not found in spreadsheet.")
        return self.worksheets_dict[title]


def _find_service_account_file() -> Optional[str]:
    """Finds the service account credentials JSON file in various candidate paths."""
    candidates = [
        settings.GOOGLE_SERVICE_ACCOUNT_JSON,
        os.path.abspath(settings.GOOGLE_SERVICE_ACCOUNT_JSON),
        os.path.join(os.getcwd(), "gujjar-petrolium-d63c4966a7e6.json"),
        os.path.join(os.getcwd(), "..", "gujjar-petrolium-d63c4966a7e6.json"),
        r"c:\Users\HP-PC\Desktop\Antigravity\Gujjar Petrolium\gujjar-petrolium-d63c4966a7e6.json",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return None


# ------------------------------------------------------------------------------
# Google Sheets Service Implementation
# ------------------------------------------------------------------------------
class GoogleSheetsService:
    def __init__(self):
        self._lock = threading.Lock()
        self._client: Any = None
        self._spreadsheet: Any = None
        self._is_mock = True
        self._init_connection()

    def _init_connection(self):
        """Initializes connection to live Google Sheets API or falls back to test mock."""
        use_mock = settings.GOOGLE_SHEETS_USE_MOCK
        creds_file = _find_service_account_file()

        has_valid_sheet_id = (
            bool(settings.GOOGLE_SHEETS_SPREADSHEET_ID)
            and settings.GOOGLE_SHEETS_SPREADSHEET_ID != "placeholder_spreadsheet_id_abc123"
        )

        if not use_mock and creds_file and has_valid_sheet_id:
            try:
                import gspread
                self._client = gspread.service_account(filename=creds_file)
                self._spreadsheet = self._client.open_by_key(settings.GOOGLE_SHEETS_SPREADSHEET_ID)
                self._is_mock = False
                logger.info(f"Connected to live Google Spreadsheet: '{self._spreadsheet.title}' (ID: {settings.GOOGLE_SHEETS_SPREADSHEET_ID[:8]}***)")
                return
            except Exception as e:
                logger.warning(
                    f"Failed to connect to live Google Sheets ({type(e).__name__}: {str(e)}). Falling back to mock."
                )

        self._spreadsheet = MockSpreadsheet()
        self._is_mock = True
        logger.info("Operating in Google Sheets Safe Mock Mode.")

    @property
    def is_mock(self) -> bool:
        return self._is_mock

    def reset_mock(self):
        """Reset mock data to clean state for automated test isolation."""
        if self._is_mock:
            self._spreadsheet = MockSpreadsheet()

    def _execute_with_retry(self, action_desc: str, func, *args, **kwargs) -> Any:
        """
        Executes Google Sheets API calls with bounded retries and exponential backoff.
        Handles transient 429 (quota exceeded), 500, and 503 errors safely.
        """
        max_retries = 3
        delay = 1.0
        for attempt in range(1, max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                err_str = str(e).lower()
                is_transient = any(code in err_str for code in ["429", "rate limit", "500", "503", "quota"])
                if is_transient and attempt < max_retries:
                    logger.warning(
                        f"Transient Google Sheets error on '{action_desc}' (attempt {attempt}/{max_retries}). Retrying in {delay}s."
                    )
                    time.sleep(delay)
                    delay *= 2.0
                else:
                    logger.error(f"Google Sheets API error on '{action_desc}': {type(e).__name__}")
                    raise GoogleSheetsAPIError(f"Failed to complete Google Sheets action: {action_desc}") from e

    # --------------------------------------------------------------------------
    # Schema Validation & Aliased Header Resolution
    # --------------------------------------------------------------------------
    def validate_tab_and_headers(self, tab_name: str) -> Tuple[Any, Dict[str, int], List[str]]:
        """
        Validates that required worksheet tab exists and contains documented headers (or known aliases).
        Returns:
            worksheet: Worksheet instance
            logical_to_col_idx: Dict mapping canonical field -> 0-based column index
            actual_row1_headers: List of exact column header strings in row 1
        """
        try:
            worksheet = self._spreadsheet.worksheet(tab_name)
        except Exception as e:
            raise SchemaValidationError(f"Required Google Sheets tab '{tab_name}' does not exist in spreadsheet.") from e

        required_logical_fields = SHEET_SCHEMAS.get(tab_name)
        if not required_logical_fields:
            raise SchemaValidationError(f"No schema specification registered for tab '{tab_name}'.")

        row1 = worksheet.row_values(1)
        if not row1:
            raise SchemaValidationError(f"Tab '{tab_name}' is completely empty (no header row found).")

        # Map actual header string (normalized lowercase) -> column index
        actual_header_to_col: Dict[str, int] = {}
        for idx, h in enumerate(row1):
            cleaned_h = h.strip().lower()
            if cleaned_h:
                actual_header_to_col[cleaned_h] = idx

        # Resolve logical fields through aliases
        logical_to_col: Dict[str, int] = {}
        missing_fields: List[str] = []

        for field in required_logical_fields:
            if field == "id" and tab_name in TAB_SPECIFIC_ID_ALIASES:
                aliases = TAB_SPECIFIC_ID_ALIASES[tab_name]
            else:
                aliases = COLUMN_ALIASES.get(field, [field])

            found_col: Optional[int] = None
            for alias in aliases:
                if alias.lower() in actual_header_to_col:
                    found_col = actual_header_to_col[alias.lower()]
                    break
            if found_col is not None:
                logical_to_col[field] = found_col
            else:
                missing_fields.append(field)

        if missing_fields:
            raise SchemaValidationError(
                f"Tab '{tab_name}' has malformed headers. Missing required columns: {missing_fields}. "
                f"Existing columns found: {row1}."
            )

        # Also map any other known optional fields that exist in the sheet
        for field, aliases in COLUMN_ALIASES.items():
            if field not in logical_to_col:
                if field == "id" and tab_name in TAB_SPECIFIC_ID_ALIASES:
                    aliases = TAB_SPECIFIC_ID_ALIASES[tab_name]
                for alias in aliases:
                    if alias.lower() in actual_header_to_col:
                        logical_to_col[field] = actual_header_to_col[alias.lower()]
                        break

        return worksheet, logical_to_col, row1

    # --------------------------------------------------------------------------
    # Read Records
    # --------------------------------------------------------------------------
    def read_records(self, tab_name: str) -> List[Dict[str, Any]]:
        """
        Reads all data rows in a tab, indexing strictly by canonical field name.
        """
        worksheet, logical_to_col, _ = self.validate_tab_and_headers(tab_name)
        all_values = worksheet.get_all_values()
        if len(all_values) <= 1:
            return []

        records: List[Dict[str, Any]] = []
        for row_num, row_data in enumerate(all_values[1:], start=2):
            record: Dict[str, Any] = {}
            for logical_field, col_idx in logical_to_col.items():
                val = row_data[col_idx] if col_idx < len(row_data) else ""
                record[logical_field] = val.strip()
            record["_row_number"] = row_num
            records.append(record)

        return records

    # --------------------------------------------------------------------------
    # Append Record
    # --------------------------------------------------------------------------
    def append_record(self, tab_name: str, record_data: Dict[str, Any]) -> None:
        """
        Safely appends a new record matching the exact header layout of the worksheet.
        """
        with self._lock:
            worksheet, logical_to_col, row1_headers = self.validate_tab_and_headers(tab_name)

            # Build a reverse lookup from 0-based col index to logical field
            col_to_logical: Dict[int, str] = {col_idx: log_field for log_field, col_idx in logical_to_col.items()}

            row_values: List[str] = []
            for col_idx in range(len(row1_headers)):
                logical_field = col_to_logical.get(col_idx)
                header_name = row1_headers[col_idx].strip()

                val = None
                if logical_field and logical_field in record_data:
                    val = record_data[logical_field]
                elif header_name in record_data:
                    val = record_data[header_name]

                # Specific debit/credit handling for Transactions tab
                if logical_field == "debit" and "amount" in record_data and record_data.get("is_debit", True):
                    val = f"PKR {record_data['amount']}"
                elif logical_field == "credit" and "amount" in record_data and not record_data.get("is_debit", True):
                    val = f"PKR {record_data['amount']}"

                if isinstance(val, (datetime,)):
                    row_values.append(val.isoformat())
                elif isinstance(val, (Decimal, int, float)):
                    row_values.append(str(val))
                elif isinstance(val, bool):
                    row_values.append("TRUE" if val else "FALSE")
                elif isinstance(val, list):
                    row_values.append(", ".join(str(item) for item in val))
                else:
                    row_values.append(str(val) if val is not None else "")

            self._execute_with_retry(
                f"append to {tab_name}",
                worksheet.append_row,
                row_values,
                value_input_option="USER_ENTERED",
            )

    # --------------------------------------------------------------------------
    # Update Permitted Non-Financial Cell
    # --------------------------------------------------------------------------
    def update_cell_by_id(self, tab_name: str, record_id: str, field_name: str, new_value: Any) -> bool:
        """
        Updates a specific field for a record matching record_id.
        """
        with self._lock:
            worksheet, logical_to_col, _ = self.validate_tab_and_headers(tab_name)
            if field_name not in logical_to_col:
                # If field_name not directly mapped, check aliases
                found_col = None
                for alias in COLUMN_ALIASES.get(field_name, [field_name]):
                    if alias in logical_to_col:
                        found_col = logical_to_col[alias]
                        break
                if found_col is None:
                    return False
                target_col_idx = found_col
            else:
                target_col_idx = logical_to_col[field_name]

            id_col_idx = logical_to_col.get("id")
            if id_col_idx is None:
                raise ValueError(f"Tab '{tab_name}' does not have an ID column.")

            all_values = worksheet.get_all_values()
            target_row_num = None
            for idx, row in enumerate(all_values[1:], start=2):
                if id_col_idx < len(row) and row[id_col_idx].strip() == record_id:
                    target_row_num = idx
                    break

            if target_row_num is None:
                return False

            col_1_based = target_col_idx + 1
            formatted_val = new_value
            if isinstance(new_value, bool):
                formatted_val = "TRUE" if new_value else "FALSE"
            elif isinstance(new_value, (Decimal, int, float)):
                formatted_val = str(new_value)
            elif isinstance(new_value, list):
                formatted_val = ", ".join(str(i) for i in new_value)
            elif isinstance(new_value, datetime):
                formatted_val = new_value.isoformat()

            self._execute_with_retry(
                f"update cell {field_name} in {tab_name}",
                worksheet.update_cell,
                target_row_num,
                col_1_based,
                formatted_val,
            )
            return True


# Global Google Sheets Service singleton
sheets_service = GoogleSheetsService()
