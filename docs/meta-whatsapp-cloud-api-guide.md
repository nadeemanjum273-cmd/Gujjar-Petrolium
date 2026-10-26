# Meta WhatsApp Cloud API — Integration & Configuration Guide

**Gujjar Petrolium Kot Gujjran**  
*Khata & Recovery Automation System — Phase 4 Implementation*

---

## 1. Overview

Phase 4 integrates the official **Meta WhatsApp Cloud API (Graph API v20.0)** into the Gujjar Petrolium platform.

This guide provides step-by-step instructions for:
- Creating a Meta Developer App and WhatsApp Business Account (WABA).
- Generating permanent System User Access Tokens.
- Configuring real-time inbound & delivery webhooks with SHA-256 HMAC verification.
- Registering approved WhatsApp Message Templates in Urdu.
- Safe testing in `DRY_RUN` mode and transitioning to `LIVE` messaging.

---

## 2. Meta Cloud API Prerequisites & App Setup

### Step 2.1: Create a Meta Developer Account & App
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **My Apps** → **Create App**.
3. Select **Other** as the use case → Next.
4. Select **Business** as the app type → Next.
5. Provide App Details:
   - **App Name**: `Gujjar Petrolium Automation`
   - **App Contact Email**: Your managerial email
   - **Business Account**: Select your Meta Business Account (or create one for Gujjar Petrolium).
6. Click **Create App**.

---

### Step 2.2: Add WhatsApp Product
1. On your App Dashboard, locate **WhatsApp** and click **Set up**.
2. Under the left navigation menu, select **WhatsApp** → **API Setup**.
3. Meta provides a temporary Test Phone Number and a temporary 24-hour Access Token for sandbox testing.
4. Note your:
   - **Phone number ID** (e.g. `123456789012345`)
   - **WhatsApp Business Account ID** (e.g. `987654321098765`)

---

### Step 2.3: Generate a Permanent System User Access Token
> [!IMPORTANT]
> Never use the 24-hour temporary token in production. Follow these steps to generate a permanent token that never expires:

1. Open [business.facebook.com/settings](https://business.facebook.com/settings/) (Meta Business Settings).
2. Under **Users**, click **System Users** → **Add**.
   - Name: `Gujjar-Petrolium-Backend-API`
   - Role: `Admin`
3. Click **Add Assets**:
   - Under **Apps**, select your app `Gujjar Petrolium Automation` and enable **Full Control (Manage App)**.
   - Under **WhatsApp Accounts**, select your WABA and enable **Full Control**.
4. Click **Generate New Token**:
   - Select your App.
   - Token expiration: **Never**.
   - Check required permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
5. Copy the generated token immediately and save it in your secure `.env` file as `WHATSAPP_ACCESS_TOKEN`.

---

### Step 2.4: Locate Your Meta App Secret
1. In [developers.facebook.com](https://developers.facebook.com/), open your app.
2. In the left sidebar, navigate to **App Settings** → **Basic**.
3. Locate **App Secret**, click **Show**, and copy the value.
4. Save this in your `.env` file as `META_APP_SECRET`. This is used to cryptographically verify incoming webhook payloads using HMAC-SHA256.

---

## 3. Webhook Configuration

### Step 3.1: Expose or Deploy Your Backend
Meta's servers require a publicly accessible HTTPS URL. During local development, you can use a tunnel such as `ngrok` or `cloudflared`:
```bash
ngrok http 8000
```
This generates a public URL, for example: `https://gujjar-petrolium-api.ngrok-free.app`.

### Step 3.2: Configure Webhook in Meta Dashboard
1. In Meta Developer Dashboard, click **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit**.
3. Set the fields:
   - **Callback URL**: `https://<YOUR_DOMAIN>/api/v1/webhook/whatsapp`
   - **Verify Token**: Choose a secret string (e.g. `gujjar_waba_secret_verify_2026`) and set it in your `.env` as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Click **Verify and Save**. Meta will send a GET request with `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`. The backend will automatically verify and return the challenge with HTTP 200.
5. Under **Webhook Fields**, click **Manage** and subscribe to:
   - `messages` (for inbound customer texts, images, and documents).
   - `message_deliveries` (for sent, delivered, read, and failed statuses).

---

## 4. WhatsApp Message Template Registration

Meta strictly requires that business-initiated outbound messages use **Approved Message Templates**.

### Template: `payment_reminder_v1`
1. In Meta WhatsApp Manager, navigate to **Account Tools** → **Message Templates** → **Create Template**.
2. **Category**: `UTILITY`
3. **Template Name**: `payment_reminder_v1`
4. **Language**: `Urdu (ur)`
5. **Body Text**:
```text
محترم جناب {{1}} صاحب،
گجر پیٹرولیم، کوٹ گجراں کے کھاتے کے مطابق آپ کا واجب الادا بقایا رقم {{2}} ہے جو کہ پچھلے {{3}} دنوں سے زیرِ التواء ہے۔
برائے مہربانی اپنا کھاتہ جلد از جلد کلیئر فرمائیں۔ شکریہ!
{{4}} (مجاز منیجر) — گجر پیٹرولیم، کوٹ گجراں
```
6. **Sample Values**:
   - `{{1}}`: چوہدری طارق
   - `{{2}}`: PKR 70,000
   - `{{3}}`: 15
   - `{{4}}`: محمد اسد
7. Submit for review. Meta typically approves utility templates within 5–15 minutes.

---

## 5. Inbound Keywords & Customer Commands

When a customer messages the pump's registered WhatsApp number:

| Inbound Message | System Response | Safety Rules |
| :--- | :--- | :--- |
| **`LEDGER`** / **`کھاتہ`** / **`بیلنس`** | Returns customer's approved outstanding balance, credit limit, and overdue days. | Authenticated strictly by registered phone number (`phone_e164`). Unregistered numbers receive a polite notice and **never** see ledger data. |
| **`STOP`** / **`بند`** | Opts the customer out (`whatsapp_consent = FALSE`). | Halts future non-essential recovery reminders. Recorded in `AuditLog`. |
| **`START`** / **`شروع`** | Re-activates WhatsApp consent (`whatsapp_consent = TRUE`). | Re-enables automated statements and notifications. Recorded in `AuditLog`. |
| **`HELP`** / **`مدد`** | Returns manager contact (Muhammad Asad), pump location Kot Gujjran, and bank account details. | Public customer service information. |
| **Image / Document** (Payment slip / screenshot) | Enters the slip into `ReceiptQueue` as `PENDING_VERIFICATION` with media reference. | **Financial Safety**: NEVER automatically credits balance. Requires Phase 5 manager verification before affecting financial ledgers. |

---

## 6. Environment Variables Reference

Add the following to your `backend/.env` file:

```bash
# ==========================================
# Meta WhatsApp Cloud API Configuration
# ==========================================
WHATSAPP_API_VERSION="v20.0"
WHATSAPP_PHONE_NUMBER_ID="your_meta_phone_number_id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_meta_waba_id"
WHATSAPP_ACCESS_TOKEN="your_permanent_system_user_token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_chosen_verify_token"
META_APP_SECRET="your_meta_app_secret"

# Messaging Mode: DRY_RUN (Safe test simulation) or LIVE (Real delivery)
MESSAGING_MODE="DRY_RUN"

# Approved Template Configuration
WHATSAPP_REMINDER_TEMPLATE_NAME="payment_reminder_v1"
WHATSAPP_REMINDER_TEMPLATE_LANG="ur"
WHATSAPP_COOLDOWN_DAYS="3"
```

---

## 7. Safe Transition to Live Messaging

1. **Verify in `DRY_RUN` Mode**:
   - Keep `MESSAGING_MODE=DRY_RUN`.
   - In the frontend dashboard at `/reminders`, open a customer preview and click **منظوری اور واٹس ایپ ارسال کریں**.
   - Verify that simulated WAMIDs (`wamid.HBgL...simulated`) appear in the log and that no real WhatsApp message was charged or delivered.
2. **Switch to `LIVE` Mode**:
   - Set `MESSAGING_MODE=LIVE` in `backend/.env`.
   - Restart the FastAPI backend server.
   - Outbound reminders will now be dispatched directly through Meta Graph API v20.0 with real delivery tracking (`sent` → `delivered` → `read`).
