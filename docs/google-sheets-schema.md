# Google Sheets Data Store Schema
## Gujjar Petrolium Kot Gujjran — Khata & Recovery Automation MVP

The MVP uses a Google Spreadsheet as an accessible, cost-effective initial data store. The spreadsheet is structured into **5 required operational tabs** plus **1 recommended audit tab**.

---

### Tab 1: `Customers` (گاہک / کسٹمرز)
Stores customer profiles, fleet metadata, credit limits, and authoritative balances.

| Column Index | Column Name | Type | Format / Example | Constraints & Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `id` | String | `CUST-001` | Unique primary key. Pattern: `CUST-[0-9]{3}` |
| **B** | `name` | String | `Chaudhry Tariq Gujjar` | Required. Full English/Roman customer name |
| **C** | `name_ur` | String | `چوہدری طارق گجر` | Optional. Urdu customer name |
| **D** | `phone` | String | `+923000000001` | Required. E.164 Pakistani phone number |
| **E** | `status` | Enum | `ACTIVE` | Values: `ACTIVE`, `INACTIVE`, `BLOCKED` |
| **F** | `credit_limit` | Decimal | `250000.00` | Non-negative PKR limit. Default `50000.00` |
| **G** | `opening_balance`| Decimal | `0.00` | Opening balance brought forward |
| **H** | `current_balance`| Decimal | `85500.00` | Authoritative outstanding debt (calculated by backend) |
| **I** | `vehicles` | String | `GLT-4412, LXZ-890` | Comma-separated authorized vehicle/tractor plates |
| **J** | `address` | String | `Kot Gujjran` | Physical village address or pump reference |
| **K** | `notes` | String | `Settles monthly` | Manager operational notes |
| **L** | `created_at` | DateTime | `2026-08-26 12:00:00` | UTC creation timestamp |
| **M** | `updated_at` | DateTime | `2026-10-25 12:00:00` | UTC last modified timestamp |
| **N** | `whatsapp_consent` | Boolean | `TRUE` | Consent given to receive WhatsApp recovery reminders |

---

### Tab 2: `Transactions` (کھاتہ / لین دین)
Append-only financial ledger. Every credit sale, payment, and adjustment is recorded as an immutable row.

| Column Index | Column Name | Type | Format / Example | Constraints & Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `id` | String | `TXN-00001` | Unique primary key. Pattern: `TXN-[0-9]{5}` |
| **B** | `customer_id` | String | `CUST-001` | Foreign key referencing `Customers.id` |
| **C** | `type` | Enum | `CREDIT_SALE` | Values: `CREDIT_SALE` (Debit), `PAYMENT` (Credit), `ADJUSTMENT` |
| **D** | `amount` | Decimal | `30000.00` | Positive monetary amount in PKR |
| **E** | `description` | String | `Diesel for Harvester` | Required description or memo |
| **F** | `transaction_date` | DateTime | `2026-10-05 14:30:00` | Date and time fuel or payment took place |
| **G** | `fuel_type` | String | `Diesel (ڈیزل)` | Optional: Diesel, Super Petrol, Engine Oil |
| **H** | `liters` | Decimal | `100.00` | Dispensed fuel quantity |
| **I** | `rate_per_liter` | Decimal | `300.00` | Unit price per liter |
| **J** | `vehicle_number` | String | `GLT-4412` | Vehicle or tractor license plate |
| **K** | `slip_number` | String | `SLIP-10491` | Physical dispenser paper slip reference |
| **L** | `adjustment_direction` | Enum | `DEBIT` | Required only if `type=ADJUSTMENT` (`DEBIT` or `CREDIT`) |
| **M** | `status` | Enum | `APPROVED` | Values: `PENDING`, `APPROVED`, `REJECTED` |
| **N** | `idempotency_key` | String | `idemp-91823` | Prevents duplicate dispenser entries |
| **O** | `created_by` | String | `Muhammad Asad` | Operator or manager recording transaction |
| **P** | `approved_by` | String | `Muhammad Asad` | Manager approving entry |
| **Q** | `created_at` | DateTime | `2026-10-05 14:30:00` | Record creation timestamp |

---

### Tab 3: `ReceiptQueue` (ادائیگی کی رسیدیں)
Unverified payment claims submitted by customers or attendants.

| Column Index | Column Name | Type | Format / Example | Constraints & Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `id` | String | `RCPT-001` | Unique primary key. Pattern: `RCPT-[0-9]{3}` |
| **B** | `customer_id` | String | `CUST-001` | References `Customers.id` |
| **C** | `claimed_amount`| Decimal | `50000.00` | Claimed payment in PKR |
| **D** | `payment_date` | DateTime | `2026-10-25 06:00:00` | Alleged transfer timestamp |
| **E** | `channel` | String | `HBL Mobile App` | Bank or transfer mode |
| **F** | `transaction_reference` | String | `HBL-TXN-981240182` | Bank TID / UTR / Cheque number |
| **G** | `receipt_image_url` | String | `https://.../slip.png` | Image reference |
| **H** | `status` | Enum | `PENDING_VERIFICATION`| Values: `PENDING_VERIFICATION`, `APPROVED`, `REJECTED` |
| **I** | `verified_by` | String | `Muhammad Asad` | Manager who checked bank statement |
| **J** | `verified_at` | DateTime | `2026-10-25 07:15:00` | Verification timestamp |
| **K** | `resulting_txn_id` | String | `TXN-00011` | Approved linked PAYMENT transaction |

---

### Tab 4: `ReminderLog` (واٹس ایپ ریمائنڈرز)
Delivery and dispatch audit for WhatsApp recovery notifications.

| Column Index | Column Name | Type | Format / Example | Constraints & Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `id` | String | `REM-001` | Unique primary key. Pattern: `REM-[0-9]{3}` |
| **B** | `customer_id` | String | `CUST-001` | Recipient customer |
| **C** | `phone` | String | `+923000000001` | Recipient phone number |
| **D** | `reminder_type` | Enum | `GENTLE` | Values: `GENTLE`, `FORMAL`, `URGENT` |
| **E** | `amount_due` | Decimal | `85500.00` | Amount quoted in notification |
| **F** | `message_text_ur`| String | `محترم چوہدری طارق...` | Urdu reminder template message |
| **G** | `status` | Enum | `DELIVERED` | Values: `QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED` |
| **H** | `wamid` | String | `wamid.HBgL...` | Meta WhatsApp message identifier |
| **I** | `sent_at` | DateTime | `2026-10-23 12:00:00` | Dispatch timestamp |
| **J** | `dry_run` | Boolean | `TRUE` | `TRUE` for test simulation; `FALSE` for live API |

---

### Tab 5: `Settings` (سیٹنگز)
Key-value configuration store for pump identity and automation thresholds.

| Row | Key | Value | Description |
| :--- | :--- | :--- | :--- |
| **1** | `BUSINESS_NAME` | `Gujjar Petrolium Kot Gujjran` | Official registered pump name |
| **2** | `BUSINESS_NAME_UR` | `گجر پیٹرولیم، کوٹ گجراں` | Urdu display brand |
| **3** | `MANAGER_NAME` | `Muhammad Asad` | Authoritative manager |
| **4** | `LOCATION` | `Kot Gujjran, Punjab, Pakistan` | Physical pump location |
| **5** | `CURRENCY` | `PKR` | Ledger currency |
| **6** | `TIMEZONE` | `Asia/Karachi` | Pump operational timezone |
| **7** | `MESSAGING_MODE` | `DRY_RUN` | Safety mode (`DRY_RUN` or `LIVE`) |
| **8** | `OVERDUE_THRESHOLD_DAYS` | `15` | Days before balance is marked overdue |
| **9** | `COOLDOWN_DAYS` | `3` | Minimum gap between reminders |
| **10** | `MEEZAN_BANK_IBAN` | `PK44MEZN0001234567890123` | Pump bank account for customer payments |

---

### Recommended Tab 6: `AuditLog` (آڈٹ لاگ)
Tamper-evident record of all managerial approvals, status modifications, and adjustments.

| Column Index | Column Name | Type | Format / Example | Constraints & Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `id` | String | `AUD-0001` | Unique log ID |
| **B** | `timestamp` | DateTime | `2026-10-25 12:00:00` | UTC event timestamp |
| **C** | `actor_name` | String | `Muhammad Asad` | Person or process executing action |
| **D** | `actor_role` | String | `MANAGER` | `MANAGER`, `OPERATOR`, `SYSTEM` |
| **E** | `action` | Enum | `APPROVE` | `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `DELETE` |
| **F** | `entity_type` | String | `TRANSACTION` | `CUSTOMER`, `TRANSACTION`, `RECEIPT`, `SETTINGS` |
| **G** | `entity_id` | String | `TXN-00001` | Target entity identifier |
| **H** | `details` | String | `Approved credit sale` | Explanation of action |
| **I** | `details_ur` | String | `ادھار ڈیزل منظور کیا گیا` | Urdu audit explanation |

---

### Service Account Configuration & Sharing Permissions

To connect a live Google Spreadsheet:
1. Create a Google Cloud Project and enable both the **Google Sheets API** and **Google Drive API**.
2. Create a **Service Account** (e.g. `gujjar-petrolium-backend@your-project-id.iam.gserviceaccount.com`).
3. Generate and download a JSON key file. Place it securely at `./credentials/google-service-account.json` (ensure it is git-ignored).
4. **Mandatory Spreadsheet Permission:** Open the designated Google Spreadsheet in Google Drive, click **Share**, and grant the Service Account email address **Editor** permissions. (Viewer permissions will cause append and cell update operations to fail).
5. Set `GOOGLE_SHEETS_SPREADSHEET_ID` in your `.env` to the 44-character spreadsheet ID extracted from the Google Sheets URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.

---

### Concurrency Limitations & Mitigation Safeguards

Google Sheets is a cloud spreadsheet designed for collaborative document editing, **not an ACID relational database**:
- **No Native Row-Level Locking:** Google Sheets does not support pessimistic locks (`SELECT ... FOR UPDATE`) or transactional isolation levels.
- **Write Skew Risk:** If two attendants at different fuel dispensers simultaneously record transactions, appending rows without synchronization can cause row displacement or rate-limit saturation.
- **Rate Limits:** Google limits standard API requests to **60 requests per minute per project user** and 300 requests per minute per project.

#### Implemented Application-Level Safeguards:
1. **Thread-Safe Mutex Locking:** All write and update operations in `GoogleSheetsService` (`append_record`, `update_cell_by_id`) run inside a thread lock (`threading.Lock`), ensuring sequential writes to the spreadsheet.
2. **Idempotency Keys:** Every dispenser transaction accepts an optional client-provided `idempotency_key`. If duplicate requests arrive (e.g. on mobile network drop and retry), the system identifies the existing transaction and returns it without double-booking credit.
3. **Bounded Retries with Exponential Backoff:** Transient Google Sheets API errors (`HTTP 429` rate limits, `HTTP 500`/`503` backend hiccups) automatically retry up to 3 times with exponential backoff (`1.0s`, `2.0s`, `4.0s`).
4. **Authoritative Calculation in Code:** Balances are never calculated using spreadsheet cell formulas (`=SUM(...)`) because formulas can be deleted or overwritten by human sheet editors. All running and outstanding balances are derived authoritatively in deterministic Python code.

