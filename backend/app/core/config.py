"""
Application Settings and Configuration for Gujjar Petrolium Kot Gujjran.
Uses Pydantic BaseSettings to parse environment variables safely.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.constants import (
    DEFAULT_BUSINESS_NAME,
    DEFAULT_BUSINESS_NAME_UR,
    DEFAULT_MANAGER_NAME,
    DEFAULT_CURRENCY,
    DEFAULT_TIMEZONE,
    DEFAULT_LANGUAGE,
    MessagingMode,
)


class Settings(BaseSettings):
    # App Settings
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change-me-to-a-secure-random-secret-key-at-least-32-chars-long"

    # Business Details
    BUSINESS_NAME: str = DEFAULT_BUSINESS_NAME
    BUSINESS_NAME_UR: str = DEFAULT_BUSINESS_NAME_UR
    MANAGER_NAME: str = DEFAULT_MANAGER_NAME
    CURRENCY: str = DEFAULT_CURRENCY
    TIMEZONE: str = DEFAULT_TIMEZONE
    DEFAULT_LANGUAGE: str = DEFAULT_LANGUAGE

    # CORS Configuration
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Auth & Security (Phase 5)
    SECRET_KEY: str = "dev-secret-key-guijar-petrolium-min-32-chars-2026"
    ADMIN_SESSION_SECRET: str = "dev-session-secret-placeholder-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    COOKIE_SECURE: bool = False
    MANAGER_USERNAME: str = "asad"
    MANAGER_PASSWORD: str = "Asad@Gujjar2026"
    STAFF_USERNAME: str = "operator"
    STAFF_PASSWORD: str = "Staff@Gujjar2026"
    VIEWER_USERNAME: str = "viewer"
    VIEWER_PASSWORD: str = "Viewer@Gujjar2026"

    # Scheduler (Phase 5)
    AUTO_REMINDERS_ENABLED: bool = False
    SCHEDULER_HOUR_PKT: int = 10
    SCHEDULER_MINUTE_PKT: int = 0

    # Google Sheets Integration (Phase 2 reserved)
    GOOGLE_SHEETS_SPREADSHEET_ID: str = "placeholder_spreadsheet_id_abc123"
    GOOGLE_SERVICE_ACCOUNT_JSON: str = "./credentials/google-service-account.json"
    GOOGLE_SHEETS_USE_MOCK: bool = True

    # Meta WhatsApp Cloud API (Phase 4)
    WHATSAPP_API_VERSION: str = "v20.0"
    WHATSAPP_PHONE_NUMBER_ID: str = "placeholder_phone_number_id_12345"
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = "placeholder_business_account_id_67890"
    WHATSAPP_ACCESS_TOKEN: str = "placeholder_whatsapp_system_user_access_token"
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = "placeholder_webhook_verification_token"
    META_APP_SECRET: str = "placeholder_meta_app_secret"
    MESSAGING_MODE: MessagingMode = MessagingMode.DRY_RUN
    WHATSAPP_REMINDER_TEMPLATE_NAME: str = "payment_reminder_v1"
    WHATSAPP_REMINDER_TEMPLATE_LANG: str = "ur"
    WHATSAPP_COOLDOWN_DAYS: int = 3

    @field_validator("WHATSAPP_API_VERSION")
    @classmethod
    def validate_api_version(cls, v: str) -> str:
        import re
        if not re.match(r"^v\d+\.\d+$", v.strip()):
            raise ValueError(f"WHATSAPP_API_VERSION '{v}' is invalid. Must follow 'vXX.X' format (e.g., 'v20.0').")
        return v.strip()

    # Gemini AI (Phase 5 reserved)
    GEMINI_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
