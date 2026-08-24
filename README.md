# 🏢 Procurement Management System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPond9888%2FProcurement-Management-System&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

> **Full-stack enterprise procurement & payment lifecycle platform**
> Built with Next.js 16 · React 19 · Supabase · TypeScript

A **Single Pane of Glass** that unifies the entire Procurement-to-Payment (P2P) workflow:
PR creation → PO issuance → Goods Receipt (GRD) → Approval chain → Payment tracking + PDF generation.

---

## ✨ Key Features

- **🔄 End-to-End Pipeline Tracker** — Interactive 6-stage visual workflow (PR → PO → GRD → Payment)
- **📋 Auto-fill GRD** — Reduces manual data entry from 15 fields to just 2 (date + file upload)
- **🔐 Role-Based Access Control** — 6 roles (staff, team_lead, manager, excom, finance, admin) with Supabase RLS
- **📄 Thai PDF Generation** — Server-side GRD document generation with embedded Thai font (Sarabun)
- **🔔 Multi-Channel Notifications** — Zoho Cliq + Zoho Mail for approval alerts
- **🌐 Webhook Integration** — Automatic GRD creation on PEAK PO webhook (HMAC-SHA256 verified)
- **🌙 Dark/Light Theme** — Full theme support with `next-themes`
- **🐳 Docker Ready** — Multi-stage Dockerfile + Coolify deployment

---


## 🚀 Live Demo & Portfolio Showcase

**🔗 [Live Demo on Vercel](https://procurement-management-system-pond9888.vercel.app)** *(Update with your actual URL)*

To demonstrate the full capability of the system without requiring enterprise Zoho accounts, this project includes a **Dev Login Bypass**. You can use this to simulate different organizational roles and experience the complete Procure-to-Pay (P2P) workflow.

### 🎭 Interactive Walkthrough (P2P Flow)

**1. The Request (Role: `Staff`)**
- **Action:** Click `Staff` on the Dev Login section of the login page.
- **Experience:** You are logged in with standard permissions. Navigate to **Purchase Requests (PR)** and click `New PR`. Fill out the form to request new equipment (e.g., Macbook Pro). Once submitted, the document enters the `Pending` state.

**2. The Approval (Role: `Manager`)**
- **Action:** Click `Logout` (bottom left), then login as `Manager`.
- **Experience:** The dashboard dynamically updates based on your role. A yellow alert banner appears: *"There are 1 items waiting for your approval"*. Click the banner to view the PR details, verify the cost center, and click **Approve**.

**3. The Executive Review (Role: `Admin / Finance`)**
- **Action:** Logout, then login as `Admin` or `Finance`.
- **Experience:** Advanced menus (`Finance Dashboard`, `Payments`, `Master Data`) are now unlocked. Navigate to the **Finance Dashboard** to view real-time aggregated metrics (OPEX vs COGS graphs) and track the newly approved document through the payment pipeline.

*(Note: The portfolio demo uses an in-memory mock database enabled via `NEXT_PUBLIC_DEV_MOCK_DATA=true` to ensure a smooth, pre-populated presentation without external database dependencies.)*

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** App Router + **TypeScript 5** |
| UI | **shadcn/ui** + **Tailwind CSS v4** (Sarabun font) |
| State | **Zustand 5** + **TanStack React Query 5** |
| Database | **Supabase** (PostgreSQL + Storage + RLS) |
| Auth | Zoho OAuth2 SSO — HTTP-only cookie session |
| PDF | **@react-pdf/renderer** (server-side, Thai) |
| Notifications | Zoho Cliq channel + Zoho Mail API |
| Hosting | Docker (Coolify / self-hosted VPS) |

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Pond9888/Procurement-Management-System.git
cd Procurement-Management-System
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase + Zoho credentials

# 3. Run database migrations
# Go to Supabase Dashboard → SQL Editor and run:
#   - supabase/migrations/20260511000001_initial_schema.sql
#   - supabase/migrations/20260511000002_storage_buckets.sql

# 4. Start development server
npm run dev
# → http://localhost:3000
```

### 🧪 Demo Mode (No External Services Needed)

```bash
# In .env.local, set:
DEV_MOCK_LOGIN=true    # Bypass Zoho SSO — login as any role
DEV_MOCK_DATA=true     # Use in-memory seed data — no Supabase needed
```

This lets you explore the full UI with realistic mock data without any external service configuration.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Payment Webapp                           │
│                    (Next.js 16 App Router)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Dashboard │    │ Pipeline │    │  PR/PO   │    │ Finance  │  │
│  │   Page    │    │ Tracker  │    │  Pages   │    │Dashboard │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│  ┌────┴───────────────┴───────────────┴───────────────┴─────┐  │
│  │                    API Routes (21)                         │  │
│  │   auth/ · pr/ · grd/ · payments/ · webhooks/ · master/   │  │
│  └────┬───────────────┬───────────────┬─────────────────────┘  │
│       │               │               │                         │
├───────┴───────────────┴───────────────┴─────────────────────────┤
│  Supabase (PostgreSQL)  │  Zoho OAuth/APIs  │  PEAK Webhook    │
│  11 tables + RLS + Views│  SSO + Mail + Cliq│  HMAC-SHA256     │
└─────────────────────────┴───────────────────┴──────────────────┘
```

---

## 🔐 Roles & Permissions

| Role | PR | GRD | Finance | Payments | Admin |
|------|----|-----|---------|----------|-------|
| `staff` | own | own | ✗ | ✗ | ✗ |
| `team_lead` | team | approve TL | ✗ | ✗ | ✗ |
| `manager` | all | approve Mgr | view | ✗ | ✗ |
| `excom` | all (approve) | ✗ | ✗ | ✗ | ✗ |
| `finance` | all | view | ✓ | ✓ | ✗ |
| `admin` | all | all | ✓ | ✓ | ✓ |

---

## 🔄 Workflow

```
Zoho Expense → PR sync → Staff Sign → TL → Manager → ExCom*
                                                        ↓
PEAK PO webhook → GRD auto-create → Staff input → Sign → TL → Manager → Approved
                                                                              ↓
                                        Finance UV/PV → Paid ✅  +  PDF 📄
* ExCom required only for PR amount > 500,000 THB
```

---

## 📁 Project Structure

```
app/
  (app)/                  # Authenticated layout (Sidebar)
    dashboard/            # Overview + pending items
    pipeline/             # 6-stage interactive pipeline tracker
    pr/ + pr/[id]/        # PR list + detail + sign/approve
    po/ + po/[id]/        # PO list + detail
    grd/ + grd/[id]/      # GRD list + detail + upload + PDF
    finance/              # Finance dashboard
    payments/             # Payment management (UV/PV tracking)
    master/employees/     # Admin employee CRUD
    guide/                # Interactive system guide
  (auth)/login/           # Login page (Zoho SSO + dev role switcher)
  api/                    # 21 API routes
components/
  grd/                    # GRD form, action buttons, doc upload, PDF button
  pr/                     # PR action buttons, approval timeline, new PR form
  finance/                # Payment row (inline edit)
  pipeline/               # Interactive pipeline tracker with animations
  master/                 # Employee row + new employee dialog
  shared/                 # Related documents chain viewer
  layout/                 # Sidebar + theme toggle
  ui/                     # 13 shadcn/ui base components
lib/
  auth.ts                 # Session management + Zoho OAuth
  supabase/               # Browser + server + service + mock clients
  zoho/expense.ts         # Zoho Expense API sync
  zoho/notify.ts          # Cliq + Mail notifications
  peak/webhook.ts         # Webhook HMAC verification
  pdf/grd-template.tsx    # React PDF GRD template (Thai)
  pipeline.ts             # Pipeline stage logic
  utils.ts                # formatTHB, formatDate, status labels
  utils-server.ts         # amountInThaiWords()
database/
  migrations/             # SQL schema + seed data (6 files)
  scripts/                # Python migration & seeding scripts
supabase/migrations/      # Supabase-native migration files
types/index.ts            # All TypeScript types & interfaces
```

---

## 🗄️ Database Schema

**11 tables** across master, transactional, and audit layers:

- **Master:** `companies`, `employees`, `vendors`, `customers`
- **Transactions:** `purchase_requests`, `purchase_orders`, `goods_receipts`, `payments`
- **Approvals:** `pr_approvals`, `grd_approvals`
- **Audit:** `activity_logs`

Key features:
- `GENERATED ALWAYS AS` columns for VAT/total calculations
- Auto-incrementing GRD numbers via PL/pgSQL function
- Row Level Security (RLS) on all tables
- Dashboard view (`v_grd_dashboard`) joining all entities

---

## 📝 API Routes

| Route | Method | Description |
|-------|--------|------------|
| `/api/auth/login` | GET | Initiate Zoho OAuth flow |
| `/api/auth/callback` | GET | OAuth code → session cookie |
| `/api/auth/dev-login` | POST | Dev-only role impersonation |
| `/api/pr` | GET/POST | PR list / sync from Zoho |
| `/api/pr/create` | POST | Create internal PR |
| `/api/pr/[id]/sign` | POST | Staff sign PR |
| `/api/pr/[id]/approve` | POST | TL/Manager/ExCom approve/reject |
| `/api/grd` | GET | GRD list |
| `/api/grd/[id]/input` | PATCH | Staff fills date/approvers |
| `/api/grd/[id]/sign` | POST | Staff sign GRD |
| `/api/grd/[id]/approve` | POST | TL/Manager approve/reject |
| `/api/grd/[id]/upload` | POST/DELETE | Upload/delete supporting docs |
| `/api/grd/[id]/pdf` | POST/GET | Generate/download PDF |
| `/api/payments` | GET/POST | Payment list / create |
| `/api/payments/[id]` | PATCH | Update UV/PV/status |
| `/api/finance/summary` | GET | Aggregated finance metrics |
| `/api/master/employees` | GET/POST | Employee CRUD (admin) |
| `/api/webhooks/peak` | POST | PEAK PO webhook (HMAC-SHA256) |
| `/api/health` | GET | Health check |

---

## 🐳 Deployment

```bash
# Docker
docker compose up --build

# Health check
curl http://localhost:3000/api/health
# → {"ok": true}
```

---

## 📄 License

This project is for **portfolio demonstration purposes**. All company names, employee data, and financial figures are fictional.
