# Security Architecture & Deployment Checklist

**Business Entity:** Gujjar Petrolium Kot Gujjran  
**Authoritative Manager:** Muhammad Asad  
**Classification:** Financial & Operational Security Review  

---

## 1. Security Verification Checklist

| Security Control | Implementation Mechanism | Status |
|---|---|:---:|
| **Absence of Tracked Secrets** | `.gitignore` explicitly excludes `.env`, `*.json` (credentials), `*.key`, `*.pem`. Verified zero hardcoded credentials committed in repo. | **PASS** |
| **Frontend Bundle Isolation** | Client-side bundles in Next.js only access `NEXT_PUBLIC_*` public variables. Meta secrets and service account JSON are strictly confined to backend. | **PASS** |
| **PBKDF2 Password Hashing** | Passwords hashed using PBKDF2-HMAC-SHA256 with unique 16-byte random salts and 100,000 iterations. Constant-time `hmac.compare_digest` prevents timing attacks. | **PASS** |
| **JWT Session Security** | Cryptographically signed HMAC-SHA256 tokens with standard expiration (`exp`) and issuance (`iat`). Signature tampering immediately rejects requests with `401`. | **PASS** |
| **Cookie Security** | Session cookies issued with `HttpOnly` (mitigating XSS) and `SameSite=Lax` (mitigating CSRF). In production, `COOKIE_SECURE=True` enforces HTTPS-only transmission. | **PASS** |
| **Brute-Force Rate Limiting** | Sliding window tracker locks out usernames/IPs after 5 consecutive failed login attempts for 15 minutes (`HTTP 429 Too Many Requests`). | **PASS** |
| **Role-Based Access Control** | Strictly separates permissions between `MANAGER` (Muhammad Asad), `STAFF`, and `READ_ONLY`. Critical financial adjustments and receipt approvals require manager authorization. | **PASS** |
| **Meta Webhook Validation** | Inbound webhooks validated via HMAC-SHA256 header `X-Hub-Signature-256` matching `META_APP_SECRET`. Untrusted requests rejected with `403`. | **PASS** |
| **Financial Idempotency** | Idempotency keys (`idempotency_key`) enforce single-execution guarantees across ledger transactions, receipt approvals, and reminder dispatch. | **PASS** |
| **Receipt Approval Firewall** | Never trusts uploaded screenshots as payment proof. Bank references deduplicated against historical records before crediting ledger. | **PASS** |
| **Safe Error Masking** | Global exception handlers sanitize stack traces and backend details, returning standardized `ErrorResponse` objects with friendly Urdu messages. | **PASS** |
| **Tamper-Evident Audit Trail** | All logins, failures, transactions, adjustments, and reminder dispatches recorded in `AuditLog` sheet tab with automated redaction of credentials. | **PASS** |

---

## 2. Sensitive Data Redaction Rules

In `backend/app/services/audit_service.py`, all metadata is scrubbed prior to writing to the audit log or application logs:

```python
SENSITIVE_KEYS = {
    "password", "secret", "token", "access_token", "api_key",
    "authorization", "cookie", "hash", "private_key", "meta_app_secret",
}
```

Any metadata field containing these keys is replaced with `[REDACTED]`.

---

## 3. Production Hardening Guidelines

1. **Rotate Development Secrets:**
   Before opening the system for live transactions, generate cryptographically secure keys:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   Set this value to `SECRET_KEY` and `ADMIN_SESSION_SECRET` in `.env`.

2. **Restrict CORS Origins:**
   Never leave `ALLOWED_ORIGINS="*"` in production. Specify exact domains:
   ```ini
   ALLOWED_ORIGINS="https://khata.gujjarpetrolium.com"
   ```

3. **Google Sheets Range Protection:**
   In Google Sheets, set permissions on `Transactions`, `AuditLog`, and `Settings` so only the service account and manager Muhammad Asad can edit cells directly.
