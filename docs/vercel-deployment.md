# Vercel Deployment Guide — Gujjar Petrolium Kot Gujjran
**گجر پیٹرولیم، کوٹ گجراں — کھاتہ اور وصولی مینجمنٹ سسٹم**

This guide provides step-by-step instructions for deploying the **Gujjar Petrolium** system to [Vercel](https://vercel.com) from your GitHub repository:
👉 `https://github.com/nadeemanjum273-cmd/Gujjar-Petrolium`

---

## 🚀 Deployment Options

You can deploy in one of two configurations:

| Configuration | Description | Best For |
|---|---|---|
| **Option A (Recommended)** | **Frontend on Vercel** + **Backend on Render / Railway / VPS** | Production with background scheduler & persistent jobs |
| **Option B (All-in-One)** | **Full Monorepo on Vercel** (Next.js + Serverless Python FastAPI) | Zero-server setup, rapid demonstration & preview |

---

## 🌟 Option A (Recommended): Frontend on Vercel

In this setup, Vercel hosts the Next.js 14 App Router frontend on its global Edge Network, while your FastAPI backend runs on a persistent cloud host (such as Render, Railway, Fly.io, or your local pump office server).

### Step 1: Push Repository to GitHub
Ensure your latest code is on GitHub:
```bash
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New…** → **Project**.
3. Select **`nadeemanjum273-cmd/Gujjar-Petrolium`** and click **Import**.

### Step 3: Configure Project Settings
- **Project Name**: `gujjar-petrolium`
- **Framework Preset**: `Next.js`
- **Root Directory**: Click **Edit** and choose `frontend` (⚠️ **Crucial Step**).

### Step 4: Add Environment Variables
Under the **Environment Variables** section, add:

| Key | Example Value | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.gujjarpetrolium.com` | URL of your deployed FastAPI backend |
| `NEXT_PUBLIC_API_V1_PREFIX` | `/api/v1` | API version prefix |

### Step 5: Deploy
Click **Deploy**. Vercel will build and deploy the Next.js Urdu RTL dashboard in under 60 seconds!

---

## ⚡ Option B: Full-Stack Monorepo on Vercel (Serverless Python)

The repository already includes root `vercel.json`, `requirements.txt`, and `api/index.py` preconfigured for Vercel Serverless Functions.

### Step 1: Import into Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New…** → **Project**.
3. Select **`nadeemanjum273-cmd/Gujjar-Petrolium`** and click **Import**.

### Step 2: Configure Root Directory
- **Root Directory**: Leave as `./` (the repository root).
- Vercel will automatically detect `vercel.json` and build the frontend while routing `/api/v1/*` to `api/index.py`.

### Step 3: Configure Environment Variables
Under **Environment Variables**, provide the following keys:

#### Essential App & Security Settings
```env
APP_ENV=production
DEBUG=false
SECRET_KEY=generate_a_random_32_char_secret_key_here
ADMIN_SESSION_SECRET=generate_another_random_32_char_secret_here
COOKIE_SECURE=true
MANAGER_USERNAME=asad
MANAGER_PASSWORD=YourStrongManagerPassword2026!
STAFF_USERNAME=operator
STAFF_PASSWORD=YourStaffPassword2026!
VIEWER_USERNAME=viewer
VIEWER_PASSWORD=YourViewerPassword2026!
```

#### Google Sheets Integration
```env
GOOGLE_SHEETS_SPREADSHEET_ID=1kESKhf60DBzXfXdGrZxXMbHYmeAtg6vyEOWsuv5qlPQ
GOOGLE_SHEETS_USE_MOCK=false
GOOGLE_SERVICE_ACCOUNT_INFO={"type":"service_account","project_id":"gujjar-petrolium",...}
```
> **Tip for Google Credentials on Vercel:** Paste the entire contents of your Google service account JSON file into `GOOGLE_SERVICE_ACCOUNT_INFO`. The backend will parse it directly without requiring a physical file on disk.

#### Meta WhatsApp Cloud API (Safe Dry-Run by Default)
```env
MESSAGING_MODE=DRY_RUN
WHATSAPP_API_VERSION=v20.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
META_APP_SECRET=your_app_secret
```

### Step 4: Deploy
Click **Deploy**.

---

## 🔍 Verification After Deployment

Once deployment finishes, verify these endpoints on your Vercel URL (`https://<project-name>.vercel.app`):

1. **Dashboard Home**:
   Visit `https://<your-project>.vercel.app/`
   Verify that the Urdu RTL layout loads properly with Noto Sans Arabic font and Gujjar Petrolium branding.

2. **Backend Health Check**:
   Visit `https://<your-project>.vercel.app/health`
   Expected response:
   ```json
   {
     "status": "healthy",
     "business": "Gujjar Petrolium Kot Gujjran",
     "business_ur": "گجر پیٹرولیم، کوٹ گجراں",
     "manager": "Muhammad Asad",
     "sheets_mode": "LIVE",
     "messaging_mode": "DRY_RUN",
     "timezone": "Asia/Karachi"
   }
   ```

3. **API Documentation**:
   Visit `https://<your-project>.vercel.app/docs` (Interactive OpenAPI Swagger UI).

4. **Manager Login**:
   Visit `https://<your-project>.vercel.app/login`
   Log in using the Manager credentials (`asad` / your configured password).

---

## 🌐 Custom Domain Setup (Optional)

To connect your own domain (e.g., `khata.gujjarpetrolium.com`):
1. In Vercel Project Dashboard, go to **Settings** → **Domains**.
2. Enter your domain name and click **Add**.
3. Follow the DNS instructions (add a `CNAME` pointing to `cname.vercel-dns.com`).
4. Vercel automatically generates and renews free SSL certificates.
