# Production Deployment & Operations Guide

**Business Entity:** Gujjar Petrolium Kot Gujjran  
**Authoritative Manager:** Muhammad Asad  
**Primary Interface:** Urdu Right-to-Left (RTL)  
**Timezone:** `Asia/Karachi` (PKT) | **Currency:** `PKR`  

---

## 1. System Requirements & Software Versions

| Component | Required Version | Purpose |
|---|---|---|
| **Python** | `3.11.x` or higher | FastAPI backend engine, Decimal arithmetic, PBKDF2 hashing |
| **Node.js** | `v18.17.0` or higher (LTS recommended) | Next.js 14 App Router frontend |
| **npm** | `v9.x` or higher | Frontend dependency management |
| **Google Sheets API** | `v4` | Tabular ledger persistence and reporting |
| **Meta Graph API** | `v20.0` | Official WhatsApp Cloud API communication |
| **Nginx / Caddy** | Latest stable | Reverse proxy, SSL/TLS termination, static caching |

---

## 2. Google Cloud Platform & Spreadsheet Configuration

### 2.1 Enable Google Sheets API
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project: `gujjar-petrolium-automation`.
3. Navigate to **APIs & Services > Library** and enable **Google Sheets API**.

### 2.2 Create Service Account
1. Go to **IAM & Admin > Service Accounts > Create Service Account**.
2. Name: `gujjar-petrolium-service-account`.
3. Grant no project-level roles (principle of least privilege).
4. Create a JSON key: **Keys > Add Key > Create new key > JSON**.
5. Save the downloaded JSON file to:
   `backend/credentials/google-service-account.json`.

### 2.3 Share Google Spreadsheet
1. Copy the service account client email:
   `gujjar-petrolium@gujjar-petrolium.iam.gserviceaccount.com`
2. Open the designated Google Spreadsheet:
   `https://docs.google.com/spreadsheets/d/1kESKhf60DBzXfXdGrZxXMbHYmeAtg6vyEOWsuv5qlPQ/edit`
3. Click **Share** and add the service account email as **Editor**.
4. Confirm the 6 required tabs exist with documented headers:
   - `Customers`
   - `Transactions`
   - `ReminderLog`
   - `ReceiptQueue`
   - `Settings`
   - `AuditLog`

---

## 3. Environment Configuration (`.env`)

Create a production `.env` file in the root workspace directory (do NOT commit to Git):

```ini
# ==============================================================================
# Gujjar Petrolium Kot Gujjran — Production Environment Configuration
# ==============================================================================

# Server & CORS
APP_NAME="Gujjar Petrolium Kot Gujjran — Khata & Recovery Automation"
APP_ENV="production"
PORT=8000
HOST="0.0.0.0"
BACKEND_URL="https://api.gujjarpetrolium.com"
FRONTEND_URL="https://khata.gujjarpetrolium.com"
ALLOWED_ORIGINS="https://khata.gujjarpetrolium.com"

# Authentication & Sessions
SECRET_KEY="<generate-random-64-character-hex-string>"
ADMIN_SESSION_SECRET="<generate-random-64-character-hex-string>"
ACCESS_TOKEN_EXPIRE_MINUTES=720
COOKIE_SECURE=True

# Manager & Staff Credentials (Change on First Production Boot)
MANAGER_USERNAME="asad"
MANAGER_PASSWORD="<strong-manager-production-password>"
STAFF_USERNAME="operator"
STAFF_PASSWORD="<strong-staff-production-password>"
VIEWER_USERNAME="viewer"
VIEWER_PASSWORD="<strong-viewer-production-password>"

# Google Sheets Integration
GOOGLE_SHEETS_USE_MOCK=False
GOOGLE_SHEETS_SPREADSHEET_ID="1kESKhf60DBzXfXdGrZxXMbHYmeAtg6vyEOWsuv5qlPQ"
GOOGLE_SERVICE_ACCOUNT_JSON="./credentials/google-service-account.json"

# Meta WhatsApp Cloud API (v20.0)
MESSAGING_MODE="DRY_RUN"  # Switch to "LIVE" only after Meta Business verification
WHATSAPP_API_VERSION="v20.0"
WHATSAPP_PHONE_NUMBER_ID="<your-meta-phone-number-id>"
WHATSAPP_BUSINESS_ACCOUNT_ID="<your-meta-waba-id>"
WHATSAPP_ACCESS_TOKEN="<permanent-system-user-access-token>"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="<custom-webhook-secret-token>"
META_APP_SECRET="<meta-app-secret-for-hmac-sha256-verification>"

# Scheduler (Asia/Karachi Business Timezone)
AUTO_REMINDERS_ENABLED=False
SCHEDULER_HOUR_PKT=10
SCHEDULER_MINUTE_PKT=0
```

---

## 4. Production Startup Commands

### 4.1 Backend (FastAPI with Gunicorn / Uvicorn Workers)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start production server (4 worker processes)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4.2 Frontend (Next.js Standalone Build)
```bash
# Navigate to frontend directory
cd frontend

# Install production dependencies
npm ci

# Build optimized production bundle
npm run build

# Start Next.js production server
npm start -- -p 3000
```

---

## 5. Nginx Reverse Proxy Configuration

```nginx
# Frontend: Next.js RTL Dashboard
server {
    server_name khata.gujjarpetrolium.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/khata.gujjarpetrolium.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/khata.gujjarpetrolium.com/privkey.pem;
}

# Backend API & Meta Webhooks
server {
    server_name api.gujjarpetrolium.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.gujjarpetrolium.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.gujjarpetrolium.com/privkey.pem;
}
```

---

## 6. Backup and Recovery Procedure

### 6.1 Google Sheets Version History
- Google Sheets automatically preserves continuous revision history.
- To view or restore past states: **File > Version history > See version history**.

### 6.2 Automated Offline Ledger Snapshots
Set up a nightly cron job on the deployment server to download an offline CSV snapshot:
```bash
# Cron command (Daily at 23:00 PKT)
0 23 * * * /usr/bin/python3 /opt/gujjar-petrolium/backend/scripts/export_sheets_backup.py
```

### 6.3 Audit Trail Retention
- All administrative operations are preserved in the `AuditLog` sheet tab.
- This tab must be protected using Google Sheets Protected Ranges:
  - Only `gujjar-petrolium-service-account` and `Muhammad Asad` have write access.
  - Pump operators and ordinary viewers have read-only access.
