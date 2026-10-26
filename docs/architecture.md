# Architecture & System Design
## Gujjar Petrolium Kot Gujjran — Khata & Recovery Automation MVP

### 1. Executive Summary
**Gujjar Petrolium Kot Gujjran** is an automated credit ledger ("Khata") and payment recovery management system built specifically for a single retail petrol pump located in Kot Gujjran, Punjab, Pakistan.

The system replaces manual paper registers with an append-only digital ledger that provides:
- Mathematical financial balance integrity.
- Right-to-Left (RTL) Urdu native user experience for pump managers and accountants.
- Safe WhatsApp recovery reminders with dry-run verification.
- Dual-step payment receipt verification before ledger approval.
- Complete audit logging of all managerial decisions.

---

### 2. Core Architectural Principles

```
                  ┌───────────────────────────────────────────────┐
                  │          Frontend: Next.js App Router         │
                  │   - Urdu RTL Design (Noto Sans Arabic)        │
                  │   - Financial Dashboards & Khata Statements   │
                  │   - Receipt Submission & Manager Approvals    │
                  └───────────────────────┬───────────────────────┘
                                          │ HTTPS / REST (JSON)
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │             Backend: FastAPI Engine           │
                  │   - Authoritative Ledger Calculations         │
                  │   - Exact Decimal Money & Quantity Math       │
                  │   - Idempotency & Duplicate Guards            │
                  │   - Meta Webhook Signature Validation         │
                  └───────────────┬───────────────┬───────────────┘
                                  │               │
                 ┌────────────────▼─┐           ┌─▼──────────────────┐
                 │ Google Sheets API│           │ WhatsApp Cloud API │
                 │ 5 Tabs + AuditLog│           │ Meta Official REST │
                 └──────────────────┘           └────────────────────┘
```

1. **Authoritative Backend Ledger Calculation:**
   The backend is the sole source of truth for financial accounting. Balances are derived using append-only principles:
   $$\text{Outstanding Balance} = \sum(\text{Approved Debits}) - \sum(\text{Approved Credits})$$
   Pending or rejected transactions never alter the customer's balance.

2. **Decimal Financial Arithmetic:**
   All monetary amounts use Python `Decimal` quantized to 2 decimal places (`PKR 0.01`). Floating-point representations (`float`) are strictly forbidden across financial data paths to eliminate binary rounding errors.

3. **Append-Only Immutability:**
   Approved ledger entries are never silently edited or deleted. Corrections are applied via new, authorized `ADJUSTMENT` transactions with explicit managerial audit notes.

4. **Two-Stage Payment Claim Verification:**
   An uploaded bank transfer slip or receipt is treated as an *unverified claim* (`PENDING_VERIFICATION`). It only transitions to `APPROVED` and generates an authoritative `PAYMENT` ledger record when verified against the pump's official bank statement by manager **Muhammad Asad**.

5. **Safe WhatsApp Messaging:**
   Meta WhatsApp Cloud API integration is governed by a strict `MESSAGING_MODE=DRY_RUN` switch. Reminders are previewed and simulated by default, preventing unauthorized or duplicate message dispatches.

---

### 3. Repository Structure & Separation of Concerns

```
petrol-pump-automation/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Versioned REST endpoints (Health, Customers, Transactions, etc.)
│   │   ├── core/           # Configuration, constants, and credential-masking logger
│   │   ├── models/         # Domain model exports
│   │   ├── schemas/        # Pydantic schemas with Decimal & Pakistani phone validators
│   │   ├── services/       # Store repository & synthetic Kot Gujjran sample data
│   │   └── main.py         # FastAPI application entrypoint with standardized error handlers
│   ├── tests/              # Pytest test suite covering health, money, schemas, and sample data
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable specification
├── frontend/
│   ├── app/                # Next.js App Router (layout.tsx with RTL and page.tsx)
│   ├── lib/                # Urdu dictionary, formatters (PKR, Karachi date), and API client
│   ├── types/              # TypeScript definitions matching backend Pydantic models
│   ├── package.json        # Node.js dependencies
│   └── .env.example        # Frontend environment variables
├── docs/                   # System design, Google Sheets schema, and API contracts
├── .gitignore
└── README.md
```

---

### 4. Authentication, RBAC & Security Architecture

1. **Password Hashing:** PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user 16-byte random salt. Format: `pbkdf2_sha256$100000$salt$hash`.
2. **Session Handling:** Cryptographically signed HMAC-SHA256 JWT tokens. Transmitted via both `Authorization: Bearer <token>` and `HttpOnly`, `SameSite=Lax` cookies (`access_token`).
3. **Brute-Force Rate Limiting:** Sliding-window failure tracker locking out credentials/IPs after 5 consecutive failures for 15 minutes (`HTTP 429`).
4. **RBAC Matrix:**
   - `MANAGER` (Muhammad Asad): Full authority (receipt approvals, adjustments, reminder dispatch, settings).
   - `STAFF`: Dispenser attendants (routine credit sales and payments, customer lookups, preview generation).
   - `READ_ONLY`: Observers and accountants (reports, running statements).
5. **Centralized Tamper-Evident Audit:** Every operational, financial, and authentication event is logged with sensitive credential redaction to Google Sheets `AuditLog`.

---

### 5. Automated Reminder Scheduler Architecture

1. **Timezone:** Bound to `Asia/Karachi` (PKT) for all business logic, operational windows, and overdue reporting.
2. **Safe Pre-Flight Filtering:**
   - Evaluates accounts with outstanding balances $> \text{PKR } 0$.
   - Strictly excludes inactive, suspended, or blocked accounts (`CustomerStatus.ACTIVE`).
   - Strictly excludes customers with `whatsapp_consent == False`.
   - Strictly enforces a **7-day duplicate prevention cooldown**.
3. **Reviewable Preview Before Send:** Batch candidate preview generated via `GET /api/v1/scheduler/preview` before manual or automated execution.
4. **Operational Guard:** Defaults to `MESSAGING_MODE=DRY_RUN` producing simulated log rows until live Meta credentials and manager approval are explicitly configured.

---

### 6. Production Upgrade Roadmap: Google Sheets to PostgreSQL

While Google Sheets provides an accessible, non-technical initial interface for Muhammad Asad, high transaction volumes warrant an upgrade to a dedicated relational database.

| Architectural Dimension | Current MVP (Google Sheets API v4) | Production Scale (PostgreSQL + asyncpg) |
|---|---|---|
| **Concurrency & Locking** | In-process Python mutex locks (`_sheet_lock`). Quota capped at 60 writes/min. | ACID row-level locking (`SELECT ... FOR UPDATE`). Thousands of concurrent operations. |
| **Transaction Latency** | 250ms – 900ms per Google API call. | < 5ms per database transaction. |
| **Integrity Constraints** | Enforced purely at FastAPI application level. | Foreign keys, unique constraints, and check constraints at database engine level. |
| **Data Retention** | Google Sheets row limit (~10M cells, practical ~50,000 ledger rows). | Multi-terabyte append-only partitioning. |
| **Proposed Transition Strategy** | Keep Google Sheets as an asynchronous **read-only replica / dashboard export**, while directing all authoritative writes to PostgreSQL. | Fast migration path using SQLAlchemy / Alembic models already mapped to Pydantic schemas. |
