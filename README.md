# Gujjar Petrolium Kot Gujjran
## Khata & Recovery Automation System

> **Business Identity:**  
> **Pump Name:** Gujjar Petrolium Kot Gujjran (`گجر پیٹرولیم، کوٹ گجراں`)  
> **Authoritative Manager:** Muhammad Asad (`محمد اسد`)  
> **Location:** Kot Gujjran, Punjab, Pakistan  
> **Currency:** PKR (`روپے`) | **Timezone:** `Asia/Karachi` (PKT) | **Interface:** Urdu Right-to-Left (RTL)

---

## 1. Executive Summary

This system is an automated credit ledger ("Khata") and recovery management platform built specifically for a single retail petrol pump in **Kot Gujjran, Punjab, Pakistan**.

The application replaces manual paper registers with an append-only digital ledger, ensuring:
- **Financial Balance Integrity:** Append-only ledger math ($\text{Balance} = \sum\text{Debits} - \sum\text{Credits}$) with Python `Decimal` quantization to 2 decimal places (`PKR 0.01`).
- **Urdu RTL First:** Native Right-to-Left dashboard with readable Noto Sans Arabic typography.
- **Two-Stage Receipt Verification:** Payment slips remain in `PENDING_VERIFICATION` until manager **Muhammad Asad** confirms statement credit.
- **Official Meta WhatsApp Cloud API (`v20.0`):** Outbound reminders governed by a mandatory `MESSAGING_MODE=DRY_RUN` switch.
- **Asia/Karachi Reminder Scheduler:** Automated candidate evaluation respecting customer consent, active status, and a 7-day duplicate send cooldown.
- **Role-Based Access Control (RBAC):** Distinct permissions for `MANAGER`, `STAFF`, and `READ_ONLY` accounts with sliding-window brute-force defense.
- **Centralized Audit Trail:** Redacted event logging persisted to Google Sheets `AuditLog`.

---

## 2. Technology Stack

- **Backend:** Python 3.11+, FastAPI, Pydantic v2, PBKDF2-HMAC-SHA256, Pytest
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Data Store:** Google Sheets API v4 (6 operational tabs: Customers, Transactions, ReminderLog, ReceiptQueue, Settings, AuditLog)
- **Messaging:** Meta WhatsApp Cloud API (`v20.0`) with HMAC-SHA256 webhook verification
- **Quality Assurance:** 70 automated backend tests passing (100% pass rate)

---

## 3. Repository Architecture

```
Gujjar Petrolium/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # Health, Auth, Customers, Transactions, Receipts, Reminders, Scheduler, Settings, Audit, Reports, Webhook
│   │   ├── core/              # Config, security (PBKDF2/JWT/lockout), constants, credential-masking logger
│   │   ├── models/            # Domain model definitions
│   │   ├── schemas/           # Pydantic validation schemas with Decimal money & phone checks
│   │   ├── services/          # Sheets service, ledger engine, customer service, WhatsApp service, scheduler, audit service
│   │   └── main.py            # FastAPI entrypoint with CORS, lifespan, and standardized error handlers
│   ├── tests/                 # 8 comprehensive Pytest test suites (70 passed tests)
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment configuration
├── frontend/
│   ├── app/                   # Next.js App Router (RTL layout, dashboard, customers, receipts, reminders, reports, settings, audit, login)
│   ├── components/            # Reusable UI, Layout (Header, Sidebar, AppShell), and Form components
│   ├── lib/                   # Urdu dictionary, formatters (PKR, Karachi date), and API client
│   ├── types/                 # Shared TypeScript interfaces
│   ├── package.json           # Node.js dependencies
│   └── .env.example           # Frontend environment configuration
├── docs/
│   ├── architecture.md        # System design and financial integrity principles
│   ├── google-sheets-schema.md# 6 required sheet tabs specification
│   ├── api-contracts.md       # Comprehensive REST API contracts
│   ├── whatsapp-setup.md      # Meta WhatsApp Cloud API v20.0 integration guide
│   ├── deployment.md          # Production deployment and operations guide
│   ├── security-checklist.md  # Security controls and data redaction review
│   ├── pilot-checklist.md     # 2-week pilot runbook for Kot Gujjran pump
│   └── google_sheets_concurrency_limitations.md # In-depth concurrency analysis
├── .gitignore
└── README.md
```

---

## 4. Quick Start (Local Development)

### 4.1 Prerequisites
- Python `3.11.x` or higher (`python --version`)
- Node.js `18.x` or higher (`node --version`)
- npm `9.x` or higher (`npm --version`)

### 4.2 Backend Setup
```bash
# Navigate to project root
cd "Gujjar Petrolium"

# Create and activate Python virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/macOS

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI development server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
- Swagger UI Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- API Health Status: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 4.3 Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
- RTL Urdu Web Dashboard: [http://localhost:3000](http://localhost:3000)
- Administrative Login: [http://localhost:3000/login](http://localhost:3000/login)

---

## 5. Demo Credentials

The system comes pre-configured with 3 role-based test accounts:

| Role | Username | Password | Permitted Actions |
|---|---|---|---|
| **MANAGER** | `asad` | `Asad@Gujjar2026` | Full approval authority (Muhammad Asad): receipt verification, financial corrections, reminder dispatch, settings management. |
| **STAFF** | `operator` | `Staff@Gujjar2026` | Dispenser attendants: enter permitted credit fuel sales & routine payments, view customer balances, prepare reminder previews. |
| **READ_ONLY** | `viewer` | `Viewer@Gujjar2026` | Auditors & observers: view customer ledger statements and overdue reports without write permissions. |

---

## 6. Testing & Quality Assurance

### 6.1 Backend Automated Test Suite
```bash
python -m pytest backend/tests
```
**Outcome:** **70 passed in 10.57s** (100% pass rate).

### 6.2 Frontend Typecheck & Linting
```bash
cd frontend
npx tsc --noEmit     # TypeScript compilation (0 errors)
npm run lint         # Next.js ESLint verification (0 errors, 0 warnings)
npm run build        # Production bundle generation (13/13 static routes generated)
```

---

## 7. Documentation Index

- [System Architecture](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/architecture.md)
- [Google Sheets Schema](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/google-sheets-schema.md)
- [REST API Contracts](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/api-contracts.md)
- [Meta WhatsApp Cloud API Guide](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/whatsapp-setup.md)
- [Production Deployment Guide](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/deployment.md)
- [Security Checklist](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/security-checklist.md)
- [Operational Pilot Runbook](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/pilot-checklist.md)
- [Google Sheets Concurrency Limitations](file:///c:/Users/HP-PC/Desktop/Antigravity/Gujjar%20Petrolium/docs/google_sheets_concurrency_limitations.md)
