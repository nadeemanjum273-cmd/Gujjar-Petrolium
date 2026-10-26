"""
Customer Service for Gujjar Petrolium Kot Gujjran.
Handles customer onboarding, phone normalization, profile updates, and safe deactivation.
"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime
import dateutil.parser

from app.core.constants import CustomerStatus, AuditAction
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.schemas.audit import AuditLogCreate
from app.services.sheets import sheets_service, parse_sheet_amount
from app.schemas.common import normalize_pakistani_phone


def _row_to_customer(row: dict) -> Customer:
    """Converts a raw Google Sheets dictionary into a validated Customer model."""
    vehicles_str = row.get("vehicles", "")
    vehicle_list = [v.strip() for v in vehicles_str.split(",") if v.strip()] if vehicles_str else []

    created_at_str = row.get("created_at")
    try:
        created_at = dateutil.parser.parse(created_at_str) if created_at_str else datetime.utcnow()
    except Exception:
        created_at = datetime.utcnow()

    updated_at_str = row.get("updated_at")
    try:
        updated_at = dateutil.parser.parse(updated_at_str) if updated_at_str else None
    except Exception:
        updated_at = None

    whatsapp_consent_str = str(row.get("whatsapp_consent", "TRUE")).strip().upper()
    whatsapp_consent = whatsapp_consent_str in ["TRUE", "1", "YES"]

    raw_phone = str(row.get("phone", "")).strip()
    try:
        phone = normalize_pakistani_phone(raw_phone)
    except Exception:
        phone = raw_phone if raw_phone.startswith("+") else f"+{raw_phone}"

    status_str = str(row.get("status", "ACTIVE")).strip().upper()
    status = CustomerStatus(status_str) if status_str in ["ACTIVE", "INACTIVE", "BLOCKED"] else CustomerStatus.ACTIVE

    return Customer(
        id=str(row.get("id", "")).strip(),
        name=str(row.get("name", "")).strip(),
        name_ur=str(row.get("name_ur", "")).strip() or None,
        phone=phone,
        status=status,
        credit_limit=parse_sheet_amount(row.get("credit_limit")),
        opening_balance=parse_sheet_amount(row.get("opening_balance")),
        current_balance=parse_sheet_amount(row.get("current_balance")),
        vehicle_numbers=vehicle_list,
        address=str(row.get("address", "")).strip() or None,
        notes=str(row.get("notes", "")).strip() or None,
        whatsapp_consent=whatsapp_consent,
        created_at=created_at,
        updated_at=updated_at,
    )


class CustomerService:
    def list_customers(
        self,
        search: Optional[str] = None,
        status: Optional[CustomerStatus] = None,
    ) -> List[Customer]:
        """
        Retrieves all customers from Google Sheets, with optional query and status filtering.
        Names are not treated as unique identifiers.
        """
        rows = sheets_service.read_records("Customers")
        customers = [_row_to_customer(r) for r in rows if r.get("id")]

        if status:
            customers = [c for c in customers if c.status == status]

        if search:
            q = search.lower().strip()
            filtered = []
            for c in customers:
                name_match = q in c.name.lower() or (c.name_ur and q in c.name_ur.lower())
                phone_match = q in c.phone
                id_match = q in c.id.lower()
                vehicle_match = any(q in v.lower() for v in (c.vehicle_numbers or []))
                if name_match or phone_match or id_match or vehicle_match:
                    filtered.append(c)
            customers = filtered

        return customers

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        """Retrieve customer by unique ID."""
        rows = sheets_service.read_records("Customers")
        for r in rows:
            if r.get("id", "").strip() == customer_id.strip():
                return _row_to_customer(r)
        return None

    def create_customer(self, data: CustomerCreate, actor_name: str = "Muhammad Asad") -> Customer:
        """
        Registers a new customer in Google Sheets.
        Validates unique customer ID, phone formatting, and WhatsApp consent.
        """
        existing_customers = self.list_customers()

        # Determine unique ID
        cust_id = data.id.strip() if data.id else None
        if not cust_id:
            existing_nums = [
                int(c.id.split("-")[1])
                for c in existing_customers
                if c.id.startswith("CUST-") and c.id.split("-")[1].isdigit()
            ]
            next_num = max(existing_nums, default=0) + 1
            cust_id = f"CUST-{next_num:03d}"

        # Duplicate ID check
        if any(c.id == cust_id for c in existing_customers):
            raise ValueError(f"Customer with ID '{cust_id}' already exists.")

        now = datetime.utcnow()
        new_customer = Customer(
            id=cust_id,
            name=data.name,
            name_ur=data.name_ur,
            phone=data.phone,
            status=data.status,
            credit_limit=data.credit_limit,
            opening_balance=data.opening_balance,
            current_balance=data.opening_balance,
            vehicle_numbers=data.vehicle_numbers,
            address=data.address,
            notes=data.notes,
            whatsapp_consent=data.whatsapp_consent,
            created_at=now,
        )

        # Prepare Google Sheets record
        record_dict = {
            "id": new_customer.id,
            "name": new_customer.name,
            "name_ur": new_customer.name_ur or "",
            "phone": new_customer.phone,
            "status": new_customer.status.value,
            "credit_limit": str(new_customer.credit_limit),
            "opening_balance": str(new_customer.opening_balance),
            "current_balance": str(new_customer.current_balance),
            "vehicles": ", ".join(new_customer.vehicle_numbers or []),
            "address": new_customer.address or "",
            "notes": new_customer.notes or "",
            "created_at": now.isoformat(),
            "updated_at": "",
            "whatsapp_consent": "TRUE" if new_customer.whatsapp_consent else "FALSE",
        }
        sheets_service.append_record("Customers", record_dict)

        # Audit Log
        sheets_service.append_record("AuditLog", {
            "id": f"AUD-{now.strftime('%Y%m%d%H%M%S')}",
            "timestamp": now.isoformat(),
            "actor_name": actor_name,
            "actor_role": "MANAGER",
            "action": AuditAction.CREATE.value,
            "entity_type": "CUSTOMER",
            "entity_id": new_customer.id,
            "details": f"Registered customer '{new_customer.name}' with credit limit PKR {new_customer.credit_limit}",
            "details_ur": f"نیا گاہک '{new_customer.name}' ادھار حد {new_customer.credit_limit} روپے کے ساتھ رجسٹر کیا گیا",
        })

        return new_customer

    def update_customer_profile(
        self,
        customer_id: str,
        update: CustomerUpdate,
        actor_name: str = "Muhammad Asad",
    ) -> Customer:
        """
        Updates allowed non-financial profile fields.
        Financial balance fields cannot be updated here.
        """
        customer = self.get_customer(customer_id)
        if not customer:
            raise ValueError(f"Customer '{customer_id}' was not found.")

        now = datetime.utcnow()
        if update.name is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "name", update.name)
        if update.name_ur is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "name_ur", update.name_ur)
        if update.phone is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "phone", update.phone)
        if update.status is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "status", update.status.value)
        if update.credit_limit is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "credit_limit", str(update.credit_limit))
        if update.vehicle_numbers is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "vehicles", ", ".join(update.vehicle_numbers))
        if update.address is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "address", update.address)
        if update.notes is not None:
            sheets_service.update_cell_by_id("Customers", customer_id, "notes", update.notes)
        if update.whatsapp_consent is not None:
            sheets_service.update_cell_by_id(
                "Customers", customer_id, "whatsapp_consent", "TRUE" if update.whatsapp_consent else "FALSE"
            )

        sheets_service.update_cell_by_id("Customers", customer_id, "updated_at", now.isoformat())

        updated = self.get_customer(customer_id)
        if not updated:
            raise ValueError(f"Failed to fetch updated customer '{customer_id}'.")
        return updated

    def deactivate_customer(
        self,
        customer_id: str,
        reason: Optional[str] = None,
        actor_name: str = "Muhammad Asad",
    ) -> Customer:
        """
        Deactivates a customer (sets status to INACTIVE) without deleting ledger history.
        """
        customer = self.get_customer(customer_id)
        if not customer:
            raise ValueError(f"Customer '{customer_id}' was not found.")

        now = datetime.utcnow()
        sheets_service.update_cell_by_id("Customers", customer_id, "status", CustomerStatus.INACTIVE.value)
        sheets_service.update_cell_by_id("Customers", customer_id, "updated_at", now.isoformat())

        # Audit log deactivation
        sheets_service.append_record("AuditLog", {
            "id": f"AUD-{now.strftime('%Y%m%d%H%M%S')}",
            "timestamp": now.isoformat(),
            "actor_name": actor_name,
            "actor_role": "MANAGER",
            "action": AuditAction.UPDATE.value,
            "entity_type": "CUSTOMER",
            "entity_id": customer_id,
            "details": f"Deactivated customer '{customer.name}'. Reason: {reason or 'Not specified'}",
            "details_ur": f"گاہک '{customer.name}' کو غیر فعال کیا گیا۔ وجہ: {reason or 'کوئی وجہ درج نہیں'}",
        })

        return self.get_customer(customer_id)  # type: ignore


customer_service = CustomerService()
