# Operational Pilot Checklist & Runbook

**Business Entity:** Gujjar Petrolium Kot Gujjran (`گجر پیٹرولیم، کوٹ گجراں`)  
**Authorized Manager:** Muhammad Asad (`محمد اسد`)  
**Location:** Kot Gujjran, Punjab, Pakistan  
**Pilot Phase Duration:** 2 Weeks (Parallel Run alongside paper registers)  

---

## 1. Pilot Phase Objectives

1. Validate digital ledger accuracy alongside existing paper registers without disrupting daily petrol and diesel dispensing.
2. Train pump staff on recording credit fuel sales via mobile and tablet interfaces.
3. Test WhatsApp recovery reminders in safe **DRY_RUN** mode with real customer phone numbers.
4. Establish the manager payment verification routine using online bank statements (Meezan Bank & HBL).

---

## 2. Pre-Pilot Verification (Day 0)

- [ ] **Google Spreadsheet Verification:**
  - Verify access to designated sheet: `1kESKhf60DBzXfXdGrZxXMbHYmeAtg6vyEOWsuv5qlPQ`.
  - Confirm all 6 tabs exist: `Customers`, `Transactions`, `ReminderLog`, `ReceiptQueue`, `Settings`, `AuditLog`.
  - Confirm service account email `gujjar-petrolium@...` has **Editor** access.
- [ ] **Credential Customization:**
  - Update `MANAGER_PASSWORD` and `STAFF_PASSWORD` in `.env` to private passwords known only to Muhammad Asad and trusted pump operators.
- [ ] **Mode Verification:**
  - Confirm `MESSAGING_MODE=DRY_RUN` in `.env` so no unsolicited live messages are dispatched accidentally.
  - Confirm `AUTO_REMINDERS_ENABLED=False`.

---

## 3. Customer Onboarding & Consent Procedure (Day 1 - 3)

For each existing credit customer (e.g. tractor fleets, transport companies, local dairy trucks):
1. Navigate to **گاہک رجسٹر کریں (Register Customer)** on the dashboard.
2. Enter the customer's full name, Urdu name, verified Pakistani mobile number (`03XX-XXXXXXX`), and approved credit limit.
3. **Explicit Consent Recording:**
   - Ask the customer: *"کیا آپ گجر پیٹرولیم سے اپنے کھاتے کی تفصیلات اور یاددہانی بذریعہ واٹس ایپ وصول کرنے کی اجازت دیتے ہیں؟"*
   - Check the **WhatsApp Consent** checkbox (`whatsapp_consent=True`) only when customer affirms.
4. Record vehicle registration plates (e.g., `GLT-4412`, `LXZ-890`).
5. Enter the existing verified opening balance from the paper register.

---

## 4. Daily Fuel Dispensing & Credit Sale Routine

1. **Dispensing Fuel on Credit:**
   - Pump operator navigates to **نیا لین دین (New Transaction)**.
   - Selects customer from the searchable dropdown.
   - Selects fuel type: **ڈیزل (Diesel)** or **پیٹرول (Super Petrol)**.
   - Enters liters and rate per liter (or total PKR amount).
   - Enters vehicle number and manual pump meter slip number.
   - Clicks **لین دین محفوظ کریں (Save Transaction)**.
2. **System Safeguards:**
   - If customer's balance exceeds their credit limit, a warning alert is displayed.
   - If customer is deactivated or blocked, fuel on credit is strictly prevented.

---

## 5. Bank Transfer & Receipt Verification Workflow

When a customer claims they paid via online bank transfer, IBFT, or cash deposit:
1. Customer or operator submits an unverified claim via **رسید جمع کریں (Submit Receipt)** with claimed amount and bank reference / TID.
2. The claim enters `PENDING_VERIFICATION` status.
3. **Manager Independent Verification Gate:**
   - Manager **Muhammad Asad** logs into the Meezan Bank or HBL business portal.
   - Locates the corresponding deposit in the pump bank account matching the TID and amount.
   - In the dashboard **ادائیگی کی رسیدیں (Receipt Queue)**:
     - If verified: Clicks **منظور کریں (Approve)** and adds verification note. (System automatically appends approved `PAYMENT` transaction and decreases ledger debt).
     - If fraudulent or unverified: Clicks **مسترد کریں (Reject)** and records reason. (Customer balance is untouched).

---

## 6. WhatsApp Reminder Testing & Authorization

1. Navigate to **واٹس ایپ یاددہانیاں (WhatsApp Reminders)**.
2. Click **پیش نظارہ دیکھیں (Preview Reminder)** for an overdue customer.
3. Review rendered Urdu message and verify parameters:
   - Customer Name
   - Overdue Amount in PKR
   - Days overdue
   - Authorized manager name (`Muhammad Asad`)
4. Verify that:
   - Customers without consent are blocked with warning.
   - Customers reminded within the last 7 days display a duplicate cooldown notice.
5. In **DRY_RUN** mode, clicking Send generates a simulated dispatch logged to `ReminderLog` without sending real messages.

---

## 7. Daily Evening Reconciliation (20:00 PKT)

Manager Muhammad Asad performs evening reconciliation:
1. Open **کھاتہ اور رپورٹ (Financial Summary)** on the dashboard.
2. Compare total daily sales against pump dispenser meter readings.
3. Review the **آڈٹ لاگ (Audit Trail)** to ensure all managerial actions were legitimate.
4. Export a backup snapshot of the Google Spreadsheet to local pump office PC.
