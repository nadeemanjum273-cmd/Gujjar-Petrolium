# REST API Contracts
## Gujjar Petrolium Kot Gujjran — Khata & Recovery Automation MVP

**Base URL:** `http://localhost:8000`  
**API Version Prefix:** `/api/v1`  
**Standard Headers:**
- `Content-Type: application/json`
- `Accept: application/json`

---

### 1. Health Check

#### `GET /health` or `GET /api/v1/health`
Returns system status, active business name in English and Urdu, and authoritative manager identity.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "app_name": "Gujjar Petrolium Kot Gujjran",
  "app_name_ur": "گجر پیٹرولیم، کوٹ گجراں",
  "version": "1.0.0",
  "environment": "development",
  "server_time": "2026-10-25T16:30:00Z",
  "timezone": "Asia/Karachi",
  "manager": "Muhammad Asad"
}
```

---

### 2. Customers API

#### `GET /api/v1/customers`
List all registered petrol pump customers with their credit balances.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "CUST-001",
      "name": "Chaudhry Tariq Gujjar",
      "name_ur": "چوہدری طارق گجر",
      "phone": "+923000000001",
      "status": "ACTIVE",
      "credit_limit": "250000.00",
      "opening_balance": "0.00",
      "current_balance": "85500.00",
      "vehicle_numbers": ["GLT-4412", "LXZ-890"],
      "address": "Dera Chaudhry Tariq, Kot Gujjran",
      "notes": "Agricultural fleet & tractors. Settles account monthly after harvest.",
      "created_at": "2026-08-26T12:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/customers`
Register a new customer with a validated Pakistani phone number.

**Request Body:**
```json
{
  "id": "CUST-006",
  "name": "Malik Asghar Transport",
  "name_ur": "ملک اصغر ٹرانسپورٹ",
  "phone": "0300-1234567",
  "credit_limit": "150000.00",
  "opening_balance": "0.00",
  "vehicle_numbers": ["LXZ-9901"],
  "address": "GT Road, Kot Gujjran",
  "notes": "Intercity oil tanker fleet"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "message_ur": "گاہک کامیابی کے ساتھ رجسٹر ہو گیا",
  "data": {
    "id": "CUST-006",
    "name": "Malik Asghar Transport",
    "name_ur": "ملک اصغر ٹرانسپورٹ",
    "phone": "+923001234567",
    "status": "ACTIVE",
    "credit_limit": "150000.00",
    "opening_balance": "0.00",
    "current_balance": "0.00",
    "vehicle_numbers": ["LXZ-9901"],
    "address": "GT Road, Kot Gujjran",
    "notes": "Intercity oil tanker fleet",
    "created_at": "2026-10-25T16:45:00Z"
  }
}
```

---

### 3. Transactions API

#### `GET /api/v1/transactions?customer_id=CUST-001`
List ledger transactions, optionally filtered by customer.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TXN-00001",
      "customer_id": "CUST-001",
      "type": "CREDIT_SALE",
      "amount": "30000.00",
      "description": "Diesel dispensing for Harvester GLT-4412",
      "transaction_date": "2026-10-05T12:00:00Z",
      "fuel_type": "Diesel (ڈیزل)",
      "liters": "100.00",
      "rate_per_liter": "300.00",
      "vehicle_number": "GLT-4412",
      "slip_number": "SLIP-10491",
      "status": "APPROVED",
      "created_by": "Muhammad Asad",
      "approved_by": "Muhammad Asad",
      "approved_at": "2026-10-05T12:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/transactions`
Record a new credit sale or payment with duplicate protection (`idempotency_key`).

**Request Body:**
```json
{
  "customer_id": "CUST-001",
  "type": "CREDIT_SALE",
  "amount": "28000.00",
  "description": "Diesel dispensing for Tractor",
  "fuel_type": "Diesel (ڈیزل)",
  "liters": "100.00",
  "rate_per_liter": "280.00",
  "vehicle_number": "GLT-4412",
  "slip_number": "SLIP-10700",
  "idempotency_key": "dispenser-pos-20261025-001"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Transaction recorded successfully",
  "message_ur": "لین دین کامیابی سے درج کر لیا گیا",
  "data": {
    "id": "TXN-00011",
    "customer_id": "CUST-001",
    "type": "CREDIT_SALE",
    "amount": "28000.00",
    "description": "Diesel dispensing for Tractor",
    "fuel_type": "Diesel (ڈیزل)",
    "liters": "100.00",
    "rate_per_liter": "280.00",
    "vehicle_number": "GLT-4412",
    "slip_number": "SLIP-10700",
    "status": "PENDING",
    "idempotency_key": "dispenser-pos-20261025-001",
    "created_by": "Muhammad Asad",
    "created_at": "2026-10-25T16:50:00Z"
  }
}
```

---

### 4. Receipts API

#### `POST /api/v1/receipts`
Submit an unverified customer payment slip.

**Request Body:**
```json
{
  "customer_id": "CUST-001",
  "claimed_amount": "25000.00",
  "channel": "Meezan Bank Raast",
  "transaction_reference": "RAAST-882190",
  "notes": "Sent slip via pump WhatsApp"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Receipt claim submitted for verification",
  "message_ur": "ادائیگی کی رسید تصدیق کیلئے جمع کر دی گئی ہے",
  "data": {
    "id": "RCPT-003",
    "customer_id": "CUST-001",
    "claimed_amount": "25000.00",
    "channel": "Meezan Bank Raast",
    "transaction_reference": "RAAST-882190",
    "status": "PENDING_VERIFICATION",
    "submitted_at": "2026-10-25T16:55:00Z"
  }
}
```

---

### 5. Customer Ledger Statement API

#### `GET /api/v1/customers/{customer_id}/ledger`
Retrieves the complete authoritative statement of account, running balances, credit limit utilization, and overdue status.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "CUST-001",
      "name": "Chaudhry Tariq Gujjar",
      "name_ur": "چوہدری طارق گجر",
      "phone": "+923000000001",
      "status": "ACTIVE",
      "credit_limit": "250000.00",
      "current_balance": "85500.00"
    },
    "ledger_entries": [
      {
        "transaction_id": "TXN-00001",
        "transaction_date": "2026-10-05T12:00:00Z",
        "type": "CREDIT_SALE",
        "description": "Diesel dispensing for Harvester GLT-4412",
        "fuel_type": "Diesel (ڈیزل)",
        "liters": "100.00",
        "rate_per_liter": "300.00",
        "status": "APPROVED",
        "debit_amount": "30000.00",
        "credit_amount": "0.00",
        "running_balance": "30000.00",
        "is_approved": true
      },
      {
        "transaction_id": "TXN-00002",
        "transaction_date": "2026-10-13T12:00:00Z",
        "type": "CREDIT_SALE",
        "description": "Diesel dispensing for Tractor LXZ-890",
        "fuel_type": "Diesel (ڈیزل)",
        "liters": "185.00",
        "rate_per_liter": "300.00",
        "status": "APPROVED",
        "debit_amount": "55500.00",
        "credit_amount": "0.00",
        "running_balance": "85500.00",
        "is_approved": true
      }
    ],
    "total_approved_debits": "85500.00",
    "total_approved_credits": "0.00",
    "outstanding_balance": "85500.00",
    "credit_limit": "250000.00",
    "available_credit": "164500.00",
    "pending_payments_count": 0,
    "pending_payments_amount": "0.00",
    "is_overdue": true,
    "days_overdue": 20,
    "oldest_unpaid_date": "2026-10-05T12:00:00Z"
  }
}
```

---

### 6. Overdue Reports API

#### `GET /api/v1/reports/overdue?threshold_days=15`
Returns all customers whose unpaid credit balance exceeds the aging threshold in the `Asia/Karachi` timezone.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "total_overdue_amount": "276550.00",
    "total_overdue_customers": 3,
    "threshold_days": 15,
    "customers": [
      {
        "customer_id": "CUST-005",
        "customer_name": "Mian Asif Tube-well Service",
        "customer_name_ur": "میاں آصف ٹیوب ویل سروس",
        "phone": "+923000000005",
        "status": "BLOCKED",
        "credit_limit": "50000.00",
        "outstanding_balance": "62300.00",
        "days_overdue": 40,
        "oldest_unpaid_date": "2026-09-15T12:00:00Z",
        "last_payment_date": null,
        "whatsapp_consent": true
      }
    ],
    "generated_at": "2026-10-25T17:00:00Z"
  }
}
```

---

### 7. Authentication & Session API

#### `POST /api/v1/auth/login`
Authenticate administrative, staff, or observer accounts. Sets an HTTP-only secure session cookie and returns a signed JWT access token. Enforces sliding window brute-force lockout after 5 consecutive failures.

**Request Body:**
```json
{
  "username": "asad",
  "password": "Asad@Gujjar2026"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Login successful",
  "message_ur": "لاگ ان کامیاب رہا۔ خوش آمدید!",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 43200,
    "user": {
      "id": "USR-001",
      "username": "asad",
      "name": "Muhammad Asad",
      "role": "MANAGER"
    }
  }
}
```

#### `GET /api/v1/auth/me`
Retrieve active user session profile and role.

**Headers:** `Authorization: Bearer <token>`

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "USR-001",
    "username": "asad",
    "name": "Muhammad Asad",
    "role": "MANAGER"
  }
}
```

#### `POST /api/v1/auth/logout`
Terminates session, clears cookie, and logs an audit logout event.

---

### 8. Reminder Scheduler API

#### `GET /api/v1/scheduler/status`
Returns scheduler configuration in `Asia/Karachi` timezone, next scheduled batch time, and historical execution summary.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "timezone": "Asia/Karachi",
    "current_time_pkt": "2026-10-26 11:15:00 PKT",
    "auto_reminders_enabled": false,
    "scheduled_time_pkt": "10:00 PKT",
    "messaging_mode": "DRY_RUN",
    "last_run_at": "2026-10-26T10:00:00+05:00",
    "last_run_summary": {
      "total_candidates": 3,
      "dispatched_live": 0,
      "simulated_dry_run": 3,
      "failed": 0
    }
  }
}
```

#### `GET /api/v1/scheduler/preview`
Generates a reviewable preview batch of overdue accounts, listing eligible candidates alongside excluded accounts (inactive, no consent, or in 7-day cooldown).

#### `POST /api/v1/scheduler/run-now`
Manually triggers an immediate scheduler batch execution. Strictly requires `MANAGER` role (`Muhammad Asad`).

---

### 9. Meta WhatsApp Webhook API

#### `GET /api/v1/webhook/whatsapp`
Handles Meta Webhook verification handshake with `hub.verify_token` and `hub.challenge`.

#### `POST /api/v1/webhook/whatsapp`
Receives inbound WhatsApp delivery receipts and customer replies with cryptographic HMAC-SHA256 signature validation via header `X-Hub-Signature-256`.

---

### 10. Standard Error Format

All error responses adhere to a uniform structure with both technical English and localized Urdu explanations:

**Response `422 Unprocessable Entity` (Validation Error):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "body -> amount: Monetary amount must be strictly greater than zero",
    "message_ur": "درج کردہ ڈیٹا درست نہیں ہے۔ برائے مہربانی دوبارہ چیک کریں۔",
    "field": "body -> amount"
  }
}
```

**Response `401 Unauthorized`:**
```json
{
  "success": false,
  "error": {
    "code": "HTTP_401",
    "message": "Authentication required. Please log in.",
    "message_ur": "درخواست پر عملدرآمد کے دوران خرابی پیش آئی ہے۔"
  }
}
```

**Response `403 Forbidden` (RBAC Denied):**
```json
{
  "success": false,
  "error": {
    "code": "HTTP_403",
    "message": "Permission denied: Requires one of ['MANAGER'] role(s). Your role: STAFF.",
    "message_ur": "درخواست پر عملدرآمد کے دوران خرابی پیش آئی ہے۔"
  }
}
```
