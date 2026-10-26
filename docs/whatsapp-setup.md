# Official Meta WhatsApp Cloud API Integration & Setup Guide

**Business Entity:** Gujjar Petrolium Kot Gujjran  
**Authorized Manager:** Muhammad Asad  
**Location:** Kot Gujjran, Punjab, Pakistan  
**Meta API Version:** `v20.0` (Official Graph API endpoint: `https://graph.facebook.com/v20.0`)  
**Default Mode:** `MESSAGING_MODE=DRY_RUN` (Simulated delivery by default to prevent accidental message dispatch)  

---

## 1. Prerequisites & Meta Business Manager Setup

1. **Meta Business Account:** A verified Meta Business Manager account with two-factor authentication enabled.
2. **WhatsApp Business Account (WABA):** Created inside Meta Business Suite under Accounts > WhatsApp Accounts.
3. **Dedicated Pakistani Phone Number:** A physical SIM or virtual number not linked to any consumer WhatsApp app. (For testing: Meta's sandbox test number).
4. **Permanent System User Access Token:**
   - Go to **Business Settings > Users > System Users**.
   - Create a System User with **Admin** role (e.g. `gujjar-automation-system-user`).
   - Assign the **WhatsApp Business Account** with `Full control`.
   - Click **Generate New Token**, select permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Select **Token Expiration: Never (Permanent)**.

---

## 2. Meta WhatsApp Cloud API Configuration

Obtain the following configuration parameters from the **Meta Developer Portal > WhatsApp > API Setup**:

| Variable | Description | Example / Production Value |
|---|---|---|
| `WHATSAPP_API_VERSION` | Official Meta Graph API version | `v20.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta assigned Sender Phone ID | `100234567890123` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA Account Identifier | `200987654321098` |
| `WHATSAPP_ACCESS_TOKEN` | Permanent System User Bearer Token | `EAAO...` (Never commit to Git) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| Custom secret string for GET challenge | `gujjar-wa-verify-secret-2026` |
| `META_APP_SECRET` | App Dashboard > App Settings > Basic | Hex secret for HMAC-SHA256 signature verification |
| `MESSAGING_MODE` | Operational Switch | `DRY_RUN` (default) or `LIVE` |

---

## 3. Approved Urdu WhatsApp Message Template

Meta requires template pre-approval for business-initiated outbound reminders.

### Template Specification:
- **Template Name:** `payment_reminder_v1`
- **Category:** `UTILITY`
- **Language:** Urdu (`ur`)
- **Body Text:**
```text
محترم جناب {{1}} صاحب،
گجر پیٹرولیم کوٹ گجراں کے کھاتے کے مطابق آپ کا واجب الادا بقایا {{2}} روپے ہے جو کہ پچھلے {{3}} دنوں سے زیرِ التواء ہے۔
برائے مہربانی اپنا کھاتہ جلد از جلد کلیئر فرمائیں۔
شکریہ۔
{{4}} (مجاز منیجر) — گجر پیٹرولیم، کوٹ گجراں
```
- **Parameter Mapping:**
  - `{{1}}`: Customer Name in Urdu (e.g., چوہدری طارق گجر)
  - `{{2}}`: Overdue Amount in PKR (e.g., 85,500.00)
  - `{{3}}`: Days overdue (e.g., 20)
  - `{{4}}`: Authorized Manager Name (`Muhammad Asad`)

---

## 4. Webhook Configuration & Cryptographic Verification

The backend exposes a webhook endpoint for Meta at:
`https://<your-public-domain>/api/v1/webhook/whatsapp`

### 4.1 Verification Challenge (`GET`)
Meta verifies ownership by sending:
- `hub.mode=subscribe`
- `hub.verify_token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>`
- `hub.challenge=<random_int>`

FastAPI validates the token in constant time and echoes back the integer challenge with `HTTP 200`.

### 4.2 Inbound Delivery & Message Handling (`POST`)
1. **HMAC-SHA256 Signature Validation:**
   Every payload includes the header:
   `X-Hub-Signature-256: sha256=<hex_digest>`
   The backend computes `hmac.new(META_APP_SECRET, raw_body, sha256)` and verifies signatures using `hmac.compare_digest`. Tampered or unsigned requests are immediately rejected with `HTTP 403 Forbidden`.
2. **Delivery Status Updates:**
   Captures `sent`, `delivered`, `read`, and `failed` events and updates `ReminderLog` tab in Google Sheets.
3. **Inbound Khata Inquiry Auto-Reply:**
   When a registered customer sends a message (e.g., `"کھاتہ"` or `"balance"`), the system checks their authorized phone number against the verified customer directory and replies with their authoritative ledger balance.

---

## 5. Safe Dry-Run Mode & Safeguards

- **Default Setting:** `MESSAGING_MODE=DRY_RUN`.
- **Behavior in Dry-Run Mode:**
  - Full financial verification and template parameter rendering take place.
  - A synthetic message ID (`wamid.HBg..._SIMULATED`) is generated.
  - The reminder is appended to Google Sheets `ReminderLog` with `dry_run=TRUE`.
  - **Zero outbound HTTP calls are made to Meta servers.**
- **Live Mode Transition:**
  - Only when `MESSAGING_MODE=LIVE` is set in production `.env` and valid credentials exist will live messages be dispatched.
