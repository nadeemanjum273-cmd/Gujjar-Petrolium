# Architectural Analysis: Limitations of Google Sheets for Concurrent Writes and Financial Workflows

**Business Entity:** Gujjar Petrolium Kot Gujjran  
**Authoritative Manager:** Muhammad Asad  
**Deployment Environment:** FastAPI + Next.js + Google Sheets API v4  
**Date:** October 2026  

---

## 1. Executive Summary

While Google Sheets provides an intuitive, zero-infrastructure tabular interface accessible to non-technical business owners, utilizing it as an authoritative ledger database introduces critical architectural and financial concurrency bottlenecks. This document outlines the documented limitations, concurrency hazards, and the software safeguards implemented in this MVP to preserve transactional integrity for Gujjar Petrolium Kot Gujjran.

---

## 2. Documented Google Sheets API Limitations

### 2.1 Rate Limits & API Quotas
- **Quota Throttling:** Google Sheets API v4 enforces a strict limit of **60 write requests per minute per user** and **300 requests per minute per project**.
- **Burst Failures:** Concurrent operations (such as automated scheduled reminders dispatching alongside customer fuel dispensing transactions) can easily trigger `HTTP 429 Too Many Requests`.

### 2.2 Lack of ACID Transactions
- **No Row-Level Locking:** Google Sheets has no native concept of row-level locks, transactional isolation levels (`SERIALIZABLE` or `READ COMMITTED`), or two-phase commits.
- **Lost Update Hazard:** If two staff members simultaneously record transactions for the same customer:
  1. Thread A reads row $N$ (balance = PKR 50,000).
  2. Thread B reads row $N$ (balance = PKR 50,000).
  3. Thread A appends transaction of PKR 10,000 and calculates balance PKR 60,000.
  4. Thread B appends transaction of PKR 5,000 and writes balance PKR 55,000.
  5. **Outcome:** Thread A's balance update is overwritten, leading to unrecorded debt.

### 2.3 Non-Deterministic Latency
- Network roundtrips to Google APIs typically take **250ms to 900ms per request**, compared to sub-millisecond latencies for relational database engines (PostgreSQL/SQLite). Under poor connectivity conditions at pump locations, request timeouts can lead to ambiguous execution states (did the append succeed before timeout?).

### 2.4 Race Conditions in Sequential ID Allocation
- Generating sequential identifiers (e.g. `TXN-00045`, `RCPT-004`) by reading existing sheet rows and computing `max(id) + 1` is subject to race conditions without distributed atomic counters.

---

## 3. Implemented Software Safeguards in FastAPI Backend

To mitigate the limitations above and guarantee rock-solid reliability for Muhammad Asad, the following controls have been implemented in the codebase:

### 3.1 Global In-Process Mutex Locks
- **Append Lock:** Critical financial writes in `backend/app/services/sheets.py` utilize threading locks (`_sheet_lock`, `_audit_lock`) to serialize concurrent append and update operations.
- **Append-Only Ledger Design:** Ledger balances are not stored as mutable single cells that get overwritten. Instead, every credit sale, payment, and adjustment is appended as an immutable record. The customer balance is computed dynamically by summing all approved debits and credits:
  $$\text{Current Balance} = \sum \text{Approved Debits} - \sum \text{Approved Credits}$$

### 3.2 Idempotency Keys (`idempotency_key`)
- Every transaction and receipt verification submission accepts an `idempotency_key` (e.g., `receipt-approved-RCPT-001`).
- If an operation is retried due to a network glitch or double-clicking, the engine detects the duplicate key and returns the existing record without duplicating ledger entries or distorting balances.

### 3.3 Exponential Backoff and Bounded Retries
- API calls to Google Sheets are wrapped with exponential backoff (1s, 2s, 4s) to absorb transient rate limit spikes (`429`) and Google server errors (`500/503`).

### 3.4 Manager Verification Gate
- To prevent phantom payments or fraudulent screenshots from corrupting the ledger, the complete receipt approval lifecycle enforces `PENDING_VERIFICATION -> APPROVED / REJECTED`.
- Exactly one `PAYMENT` entry is created only when Muhammad Asad explicitly verifies the bank transaction reference against the pump bank statement.

---

## 4. Production Migration Recommendation

For future scaling beyond 500 daily transactions or multiple pump branches:
1. **Primary Database:** Transition core Khata ledgers to **PostgreSQL** with `SELECT ... FOR UPDATE` row locks and strict ACID compliance.
2. **Google Sheets as Read-Only Replica:** Asynchronously mirror transactions to Google Sheets via background webhooks or scheduled sync workers solely for viewing by Muhammad Asad.
