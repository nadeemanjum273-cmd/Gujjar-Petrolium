"""
System Settings Endpoints for Gujjar Petrolium Kot Gujjran.
Reads from and writes to the Google Sheets Settings tab.
Restricts modifications to MANAGER role (Muhammad Asad) and logs audit events.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings as app_settings
from app.core.constants import AuditAction
from app.core.security import require_manager, require_authenticated
from app.schemas.settings import SystemSettings, SystemSettingsUpdate, BankAccountDetail
from app.schemas.common import APIResponse
from app.services.sheets import sheets_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=APIResponse[SystemSettings])
def get_settings(
    current_user: dict = Depends(require_authenticated),
) -> APIResponse[SystemSettings]:
    """Retrieve pump metadata, recovery policies, and bank account numbers."""
    rows = sheets_service.read_records("Settings")
    key_val_map = {str(r.get("key", "")).strip().lower(): str(r.get("value", "")).strip() for r in rows if r.get("key")}

    # Default settings merged with sheet values
    res = SystemSettings(
        business_name=key_val_map.get("business_name", app_settings.BUSINESS_NAME),
        business_name_ur=key_val_map.get("business_name_ur", app_settings.BUSINESS_NAME_UR),
        manager_name=key_val_map.get("manager_name", app_settings.MANAGER_NAME),
        location=key_val_map.get("location", "Kot Gujjran, Punjab, Pakistan"),
        currency=key_val_map.get("currency", "PKR"),
        timezone=key_val_map.get("timezone", "Asia/Karachi"),
        default_language=key_val_map.get("default_language", "ur"),
        overdue_threshold_days=int(key_val_map.get("overdue_threshold_days", "15")),
        cooldown_days_between_reminders=int(key_val_map.get("cooldown_days", "3")),
        contact_phone=key_val_map.get("contact_phone", "+923000000000"),
        bank_accounts=[
            BankAccountDetail(
                bank_name="Meezan Bank Ltd",
                bank_name_ur="میزان بینک لمیٹڈ",
                account_title="Gujjar Petrolium Kot Gujjran",
                account_number="PK44MEZN0001234567890123",
                branch_name="Kot Gujjran Branch",
            ),
            BankAccountDetail(
                bank_name="Habib Bank Limited (HBL)",
                bank_name_ur="حبیب بینک لمیٹڈ",
                account_title="Muhammad Asad",
                account_number="PK60HABB0009876543210123",
                branch_name="Gujranwala Cantt Branch",
            ),
        ],
    )
    return APIResponse(data=res)


@router.put("", response_model=APIResponse[SystemSettings])
def update_settings(
    payload: SystemSettingsUpdate,
    manager: dict = Depends(require_manager),
) -> APIResponse[SystemSettings]:
    """
    Update pump configuration, recovery parameters, and contact info.
    Requires MANAGER role (Muhammad Asad).
    """
    data_dict = payload.model_dump(exclude_unset=True)
    for key, value in data_dict.items():
        if value is not None and not isinstance(value, (list, dict)):
            sheets_service.update_cell_by_id("Settings", key, "value", str(value))

    # Audit log
    audit_service.log_event(
        action=AuditAction.UPDATE,
        entity_type="SETTINGS",
        entity_id="GLOBAL_CONFIG",
        actor_name=manager.get("name", "Muhammad Asad"),
        actor_role="MANAGER",
        details=f"Manager updated settings: {list(data_dict.keys())}",
        details_ur="منیجر نے سسٹم سیٹنگز میں ترمیم کی",
        metadata=data_dict,
    )

    return get_settings(current_user=manager)
