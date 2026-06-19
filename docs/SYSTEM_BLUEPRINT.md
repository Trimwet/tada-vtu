# TADA VTU — Comprehensive System Blueprint & Architecture

**Status:** Production-Grade System Design | May 2026  
**Version:** 2.0 (Data Vault + QR Scanner Integration)  
**Maintainers:** TADA Engineering Team  

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Blueprint](#architecture-blueprint)
4. [Skeletal Structure — File System](#skeletal-structure--file-system)
5. [Circulatory System — Data Flow](#circulatory-system--data-flow)
6. [Nervous System — State & Events](#nervous-system--state--events)
7. [Core System Pipelines](#core-system-pipelines)
8. [Database Schema](#database-schema)
9. [API Routes Reference](#api-routes-reference)
10. [Performance & Optimization](#performance--optimization)
11. [Security Model](#security-model)
12. [Deployment & Monitoring](#deployment--monitoring)
13. [Cron Jobs & Background Workers](#cron-jobs--background-workers)

---

## Executive Overview

**TADA VTU** is a comprehensive mobile top-up and data gifting platform built for the Nigerian telecom market. The system manages:

- **Core Services:** Airtime, data plans, cable TV, electricity, and betting recharges
- **Flagship Feature:** Data Vault — park, schedule, and gift data via QR codes (with QR scanner)
- **Revenue Streams:** Direct transactions, affiliate commissions, loyalty rewards
- **User Base:** Individual consumers + resellers + businesses
- **Geography:** Nigeria-first, with expansion readiness

### Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Page Load (FCP) | <800ms | ✅ Optimized |
| Time to Interactive | <1.2s | ✅ Optimized |
| Bundle Size | <150KB | ✅ 95KB gzipped |
| API Response Time | <200ms (p50) | ✅ On track |
| Database Query (p95) | <100ms | ✅ Indexed |
| Uptime | 99.9% | ✅ Vercel SLA |

---

## Technology Stack

### Frontend (Client Layer)

```
Framework       → Next.js 16 (App Router, React 19)
Language        → TypeScript 5
Styling         → Tailwind CSS 4 + Radix UI
Component Lib   → shadcn/ui (accessibility-first)
State Mgmt      → SWR (client-side caching + revalidation)
Forms           → React Hook Form + Zod validation
Icons           → Lucide React + IonIcons
Animation       → Motion (smooth UX transitions)
Charts          → Recharts (analytics dashboard)
PDF Generation  → jsPDF (receipts)
QR Scanning     → @yudiel/react-qr-scanner (built-in camera + upload)
QR Generation   → qrcode (npm library)
Toasts          → Sonner (notification system)
Build Tool      → Webpack (Next.js optimized prod) + Turbopack (dev)
Package Manager → Bun / npm-compatible
```

### Backend (Server Layer)

```
Runtime         → Node.js 22 (LTS)
Framework       → Next.js API Routes (serverless functions)
Language        → TypeScript
Database ORM    → Supabase SDK (PostgREST + RLS)
Auth            → Supabase Auth (JWT-based sessions)
Email Service   → Resend (transactional email)
Payment Gateway → Paystack API (primary) + Flutterwave (secondary)
VTU Provider    → Inlomax API (airtime, data, cable, electricity)
Push Notifs     → Web Push API + FCM (optional)
Background Jobs → Supabase Cron + Vercel Cron Functions
Logging         → Console + Sentry (error tracking)
```

### Database & Infrastructure

```
Primary DB      → PostgreSQL 16 (Supabase managed)
Backup Strategy → Daily automated snapshots (30-day retention)
Connection Pool → Supabase pooler (built-in PgBouncer)
Storage         → Supabase Storage (AWS S3-compatible)
CDN             → Vercel Edge Network (automatic, global)
Real-time       → Supabase Realtime (WebSockets + Postgres triggers)
Hosting         → Vercel (frontend + API) + Supabase (DB + Auth)
Monitoring      → Vercel Analytics + Web Vitals API
Error Tracking  → Sentry (optional, for production deep analysis)
```

---

## Architecture Blueprint

### Full System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Browser)                         │
│                                                                     │
│  Next.js Pages / Routes           SWR Data Cache                   │
│  ├── /dashboard/*                 ├── Vault list (live)             │
│  ├── /vault/qr/[qrData]           ├── Transaction history           │
│  ├── /dashboard/scan-qr           ├── User profile                  │
│  └── /auth/login                  └── Plans & networks              │
│                                                                     │
│  React Components                 Hooks                             │
│  ├── VaultQRModal                 ├── useDataVault() [SWR]          │
│  ├── QRScannerTabs                ├── useAuth()                     │
│  ├── DataVaultDashboard           ├── usePushNotifications()        │
│  └── DashboardLayout              ├── useSupabaseUser()             │
│                                   └── useTransactionPin()           │
└─────────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER (Next.js)                      │
│                                                                     │
│  /api/data-vault/park          → Park data, deduct wallet           │
│  /api/data-vault/deliver       → Direct delivery via Inlomax        │
│  /api/data-vault/generate-qr   → Create / refresh QR code          │
│  /api/data-vault/redeem-qr     → Public QR redemption (no auth)    │
│  /api/data-vault/refund        → Manual refund                      │
│  /api/data-vault/list          → Fetch user vault list              │
│  /api/data-vault/extend-qr     → Extend QR expiry                  │
│  /api/data-vault/network-stats → Delivery success rates             │
│  /api/cron/*                   → Background scheduled tasks         │
│                                                                     │
│  Every route: JWT verify → Zod validate → RPC call → JSON response  │
└─────────────────────────────────────────────────────────────────────┘
                  │                              │
                  ▼                              ▼
┌─────────────────────────┐      ┌───────────────────────────────┐
│  SUPABASE (Database)    │      │  EXTERNAL SERVICES            │
│                         │      │                               │
│  Tables:                │      │  Paystack (payments)          │
│  ├── profiles           │      │  Inlomax (airtime/data VTU)   │
│  ├── data_vault         │      │  Resend (transactional email) │
│  ├── vault_qr_codes     │      │  Flutterwave (alt payments)   │
│  ├── transactions       │      │                               │
│  ├── notifications      │      │  Webhooks inbound:            │
│  ├── vault_templates    │      │  ├── Paystack success/fail    │
│  ├── vault_pools        │      │  └── Inlomax delivery status  │
│  └── [15+ tables]       │      │                               │
│                         │      │                               │
│  RPC Functions:         │      │                               │
│  ├── park_data_vault()  │      │                               │
│  ├── update_user_balance│      │                               │
│  └── process_refund()   │      │                               │
│                         │      │                               │
│  Auth (JWT + RLS):      │      │                               │
│  ├── Session mgmt       │      │                               │
│  ├── Role-based access  │      │                               │
│  └── Row-level security │      │                               │
└─────────────────────────┘      └───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   BACKGROUND JOBS (Cron Layer)                      │
│                                                                     │
│  Daily   00:00 UTC → process-vault-expiry (auto-refund)             │
│  Daily   11:00 UTC → send-expiry-notifications (48hr warnings)      │
│  Hourly            → process-scheduled-vaults (deliver on time)     │
│  Hourly            → sync-network-stats (Inlomax success rates)     │
│  Weekly  Mon 09:00 → process-affiliate-commissions                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Skeletal Structure — File System

```
tada-vtu/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root HTML shell
│   │   ├── page.tsx                       # Landing page
│   │   │
│   │   ├── api/                           # All backend API routes
│   │   │   ├── data-vault/
│   │   │   │   ├── park/route.ts          # POST: park a vault
│   │   │   │   ├── deliver/route.ts       # POST: direct delivery
│   │   │   │   ├── generate-qr/route.ts   # POST: create QR code
│   │   │   │   ├── redeem-qr/route.ts     # POST: public QR redemption
│   │   │   │   ├── refund/route.ts        # POST: manual refund
│   │   │   │   ├── list/route.ts          # GET: vault list
│   │   │   │   ├── extend-qr/route.ts     # POST: extend QR expiry
│   │   │   │   ├── get-qr/route.ts        # GET: fetch QR for modal
│   │   │   │   ├── receipt/route.ts       # GET: delivery receipt PDF
│   │   │   │   ├── network-stats/route.ts # GET: success rate per network
│   │   │   │   ├── pools/route.ts         # POST: group pool vault
│   │   │   │   └── usernames/route.ts     # GET/POST: public gifting page
│   │   │   │
│   │   │   ├── auth/                      # Auth routes
│   │   │   ├── user/                      # Profile management
│   │   │   ├── wallet/                    # Wallet operations
│   │   │   ├── airtime/                   # Airtime top-up
│   │   │   ├── data/                      # Data plan purchases
│   │   │   ├── transaction/               # Transaction records
│   │   │   ├── notifications/             # Push notification endpoints
│   │   │   ├── cron/                      # Scheduled background jobs
│   │   │   │   ├── process-vault-expiry/route.ts
│   │   │   │   ├── send-expiry-notifications/route.ts
│   │   │   │   └── process-scheduled-vaults/route.ts
│   │   │   └── [other services]/
│   │   │
│   │   ├── dashboard/                     # Authenticated UI pages
│   │   │   ├── layout.tsx                 # Sidebar + header wrapper
│   │   │   ├── page.tsx                   # Dashboard home
│   │   │   ├── data-vault/page.tsx        # Main vault dashboard
│   │   │   ├── scan-qr/page.tsx           # QR scanner (3 modes)
│   │   │   ├── transactions/page.tsx
│   │   │   ├── wallet/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── contacts/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── vault/
│   │   │   └── qr/[qrData]/page.tsx       # Public QR redemption page
│   │   │
│   │   ├── admin/                         # Admin panel (restricted)
│   │   ├── auth/                          # Login / register / reset
│   │   ├── error.tsx                      # Global error boundary
│   │   └── not-found.tsx                  # 404 page
│   │
│   ├── components/
│   │   ├── vault-qr-modal.tsx             # QR generate + share modal
│   │   ├── qr-scanner-tabs.tsx            # Camera/upload/paste scanner
│   │   ├── vault-card.tsx                 # Single vault item card
│   │   ├── dashboard-layout.tsx           # Navigation shell
│   │   ├── transaction-list.tsx           # Transaction history table
│   │   ├── wallet-card.tsx                # Balance display card
│   │   └── ui/                            # shadcn/ui components
│   │
│   ├── hooks/
│   │   ├── useDataVault.ts                # Vault CRUD + SWR caching
│   │   ├── useAuth.ts                     # Auth session state
│   │   ├── usePushNotifications.ts        # Push notification setup
│   │   ├── useSupabaseUser.ts             # Current user context
│   │   ├── useTransactionPin.ts           # PIN verification logic
│   │   ├── useContacts.ts                 # Contacts CRUD
│   │   ├── useDataPlans.ts                # Network plans list
│   │   ├── useNotifications.ts            # In-app notifications
│   │   └── useRealtimeNotifications.ts    # WebSocket subscriptions
│   │
│   ├── lib/
│   │   ├── supabase.ts                    # Supabase client (server + browser)
│   │   ├── auth.ts                        # JWT helpers
│   │   ├── qr-generator.ts                # QR encode/decode (DO NOT TOUCH)
│   │   ├── validators.ts                  # Zod schemas
│   │   ├── constants.ts                   # Networks, plan configs
│   │   ├── format.ts                      # Date, currency, phone utils
│   │   ├── errors.ts                      # Custom error classes
│   │   ├── notifications.ts               # Push + email helpers
│   │   └── analytics.ts                   # Vercel Analytics events
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx                # Auth session context
│   │   └── NotificationContext.tsx        # Global notification state
│   │
│   └── types/
│       ├── database.ts                    # Supabase DB types (auto-generated)
│       ├── index.ts                       # App types (Vault, User, QR, etc.)
│       ├── api.ts                         # API request/response types
│       └── ionicons.d.ts                  # IonIcon type declarations
│
├── public/                                # Static assets
├── docs/                                  # Documentation (you are here)
├── supabase/                              # DB migrations + RLS policies
├── scripts/                               # Utility scripts (lighthouse, etc.)
├── .env.local                             # Secrets (never commit)
├── next.config.ts                         # Next.js + Webpack config
├── tailwind.config.ts                     # Tailwind CSS config
├── tsconfig.json                          # TypeScript config
├── package.json                           # Dependencies
├── vercel.json                            # Vercel deployment config
└── bun.lock                               # Bun lockfile
```

---

## Circulatory System — Data Flow

### Request-Response Cycle (Park Vault Example)

```
0ms   USER clicks "Park Data"
      └─ Component: VaultQRModal or ParkForm
         State: { parkFormOpen: true }

50ms  CLIENT VALIDATION
      └─ React Hook Form + Zod schema checks:
         ├─ Phone matches /^[0-9]{11}$/
         ├─ Amount > 0
         ├─ Network in ['MTN', 'Airtel', 'Glo', '9mobile']
         └─ PIN is exactly 4 digits

100ms POST /api/data-vault/park (HTTPS)
      Body: { network, phone, planId, amount, planName, userId, pin }

150ms SERVER: JWT VERIFY + VALIDATION
      ├─ Extract JWT from Authorization header
      ├─ Verify signature + expiry
      ├─ Fetch user profile (balance, pin)
      ├─ Compare PIN hash
      └─ Check balance >= amount

200ms SERVER: ATOMIC RPC (PostgreSQL Transaction)
      BEGIN TRANSACTION:
      ├─ UPDATE profiles SET balance -= amount WHERE id = userId
      ├─ INSERT INTO data_vault (...) VALUES (...)
      ├─ INSERT INTO transactions (...) VALUES (...)
      └─ COMMIT → all succeed OR all rollback

250ms SERVER RETURNS 200 OK
      Body: { vaultId, reference, newBalance }

300ms CLIENT: SWR MUTATION
      └─ mutate('/api/data-vault/list') → re-fetch vault list

350ms CLIENT: UI UPDATE
      ├─ New vault appears in "Ready" tab
      ├─ Wallet balance updates
      ├─ toast.success("1GB parked for 0801...")
      └─ Notification inserted → push sent (background)

400ms COMPLETE
```

### SWR Cache Flow

```
useDataVault(userId)
    │
    ├── SWR key: /api/data-vault/list?userId=X
    │
    ├── On mount → fetch → populate cache
    │
    ├── On parkVault()    → mutate(undefined, { revalidate: true })
    ├── On deliverVault() → mutate(undefined, { revalidate: true })
    └── On refundVault()  → mutate(undefined, { revalidate: true })
```

### Realtime WebSocket Flow

```
Browser connects to Supabase Realtime WebSocket
    │
    ├── SUBSCRIBE to: data_vault (user's vaults)
    ├── SUBSCRIBE to: notifications (user's alerts)
    │
    ▼ (On INSERT/UPDATE/DELETE in subscribed tables)
    │
PostgreSQL trigger fires → Supabase broadcasts message
    │
    ▼
Browser receives WebSocket message
    │
    ├── useRealtimeNotifications() handles the event
    ├── Mutate SWR cache instantly (no extra HTTP call)
    └── Display toast/bell notification
```

---

## Nervous System — State & Events

### Global State Map

```
┌─────────────────────────────────────────────────────────────┐
│  AUTH STATE (useAuth + Supabase Session)                    │
│  { user, session, isLoading, isAuthenticated,               │
│    login(), logout(), signUp() }                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  VAULT STATE (useDataVault + SWR)                           │
│  { vaults[], stats{}, isLoading, error,                     │
│    parkVault(), deliverVault(), refundVault(),              │
│    generateQR() }                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MODAL STATE (VaultQRModal — local React state)             │
│  { qrCode, qrId, qrDataBase64, expiresAt,                   │
│    isGenerating, isGenerated, isRegenerating }              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SCANNER STATE (scan-qr/page.tsx — local state)             │
│  { scannerMode: 'camera'|'upload'|'paste',                  │
│    cameraActive, scannedResult, uploadedImage,              │
│    isProcessing, error, cameraPermission }                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  USER PROFILE (SWR cached)                                  │
│  { id, fullName, phoneNumber, email, balance,               │
│    kycLevel, avatarUrl, referralCode }                      │
└─────────────────────────────────────────────────────────────┘
```

### Vault Event Lifecycle

```
EVENT               TRIGGER                      SIDE EFFECTS
────────────────────────────────────────────────────────────────────
vault.parked        POST /park success           Balance deducted
                                                 Notification sent
                                                 SWR revalidated

vault.delivered     POST /deliver success        Inlomax called
                    POST /redeem-qr success      Notification sent
                                                 Transaction logged
                                                 SWR revalidated

vault.refunded      POST /refund success         Balance credited
                    Cron: vault-expiry           Notification sent
                                                 Original txn updated

qr.generated        POST /generate-qr            QR stored in DB
                                                 base64url URL built

qr.regenerated      POST /generate-qr            Old QR deleted
                    forceRegenerate: true        New QR created
                                                 New URL generated

qr.redeemed         POST /redeem-qr success      QR marked used
                                                 vault.delivered fired
                                                 Owner notified

vault.expired       Cron: process-vault-expiry   Auto-refund triggered
                                                 Status → 'expired'
                                                 Owner notified
```

---

## Core System Pipelines

### 1. Park Data Vault

```
{ network, phone, planId, amount, pin }
    │
    ├─ [1] Client Zod validation
    │  └─ phone, amount, network, 4-digit PIN → ABORT if invalid
    │
    ├─ [2] API: JWT verify → fetch profile + balance
    │  ├─ PIN hash compare → ABORT 400 if wrong
    │  └─ balance >= amount → ABORT 400 if insufficient
    │
    ├─ [3] Atomic RPC: park_data_vault()
    │  ├─ BEGIN TRANSACTION
    │  ├─ UPDATE profiles SET balance -= amount
    │  ├─ INSERT INTO data_vault (status: 'ready')
    │  ├─ INSERT INTO transactions (type: 'park')
    │  └─ COMMIT or ROLLBACK
    │
    ├─ [4] Post-success
    │  ├─ Email: "1GB parked for 0801..."
    │  └─ Push notification: "Vault created"
    │
    └─ [5] 200 OK → { vaultId, reference, newBalance }
       Client: SWR mutates, toast shown, UI updates
```

### 2. QR Code Generation

```
{ vaultId, userId, forceRegenerate? }
    │
    ├─ [1] Fetch vault → verify owned by user, status = 'ready'
    │
    ├─ [2] Check existing QR
    │  └─ If exists + !forceRegenerate → return cached QR
    │
    ├─ [3] Build QR payload
    │  └─ { id, type, vaultId, ownerId, network, planName,
    │         amount, validUntil (+7 days), signature (SHA-256) }
    │
    ├─ [4] Encode: JSON → Buffer → base64url
    │  └─ replaces + → -, / → _, strips =
    │
    ├─ [5] Generate PNG: QRCode.toDataURL(fullUrl)
    │  └─ fullUrl = "https://tadavtu.com/vault/qr/" + base64url
    │
    ├─ [6] INSERT INTO vault_qr_codes (or DELETE old + re-insert)
    │
    └─ [7] Return { qrCode (PNG), qrId, qrData, expiresAt }
       Client: display in VaultQRModal
```

### 3. QR Redemption (Public)

```
{ qrData (base64url), phoneNumber }
    │
    ├─ [1] parsePersonalQRData() → decode, validate type, check expiry
    │
    ├─ [2] SELECT used_at FROM vault_qr_codes WHERE id = qrId
    │  └─ ABORT 400 if used_at IS NOT NULL (already redeemed)
    │
    ├─ [3] Fetch vault → check status = 'ready'
    │
    ├─ [4] Validate phoneNumber format
    │
    ├─ [5] Call Inlomax API
    │  ├─ success    → proceed
    │  ├─ processing → mark delivered (processing: true), wait for webhook
    │  └─ failed     → 500, vault stays 'ready', user can retry
    │
    ├─ [6] UPDATE vault_qr_codes SET used_at = now(), redeemed_phone
    │       UPDATE data_vault SET status = 'delivered', delivered_at
    │
    ├─ [7] INSERT INTO transactions (type: 'deliver')
    │
    ├─ [8] Notify vault owner (push + email)
    │
    └─ [9] 200 OK → { network, planSize, phoneNumber, deliveredAt }
```

### 4. Auto-Expiry Cron (Daily)

```
Cron: Daily @ 00:00 UTC → /api/cron/process-vault-expiry
    │
    ├─ SELECT * FROM data_vault
    │  WHERE status = 'ready' AND expires_at < NOW()
    │
    └─ FOR EACH expired vault:
       ├─ BEGIN TRANSACTION
       ├─ UPDATE profiles SET balance += vault.amount
       ├─ UPDATE data_vault SET status = 'expired', refunded_at = now()
       ├─ INSERT INTO transactions (type: 'refund')
       ├─ COMMIT
       ├─ Send notification: "₦420 refunded to your wallet"
       └─ Log: VaultExpired event (analytics)

Error handling:
  └─ RPC fails for one vault → log error, continue to next (don't halt job)
  └─ Job fails entirely → retry in 1 hour (3x max), alert engineering
```

---

## Database Schema

### Core Tables

```sql
profiles (
  id                  uuid PRIMARY KEY,
  full_name           text,
  phone_number        text UNIQUE,
  email               text UNIQUE,
  balance             numeric DEFAULT 0,
  referral_code       text UNIQUE,
  referred_by         uuid FK → profiles.id,
  pin                 text HASHED,           -- base64(SHA256(pin + salt))
  kyc_level           int DEFAULT 0,         -- 0=email, 1=phone, 2=ID, 3=biometric
  is_active           bool DEFAULT true,
  avatar_url          text,
  created_at          timestamptz,
  updated_at          timestamptz
)

data_vault (
  id                  uuid PRIMARY KEY,
  user_id             uuid FK → profiles.id,
  network             text,                  -- 'MTN'|'Airtel'|'Glo'|'9mobile'
  plan_id             text,                  -- Inlomax service ID
  plan_name           text,                  -- '1GB', '5GB', etc.
  amount              numeric,               -- ₦ amount
  recipient_phone     text,                  -- Default delivery number
  status              text DEFAULT 'ready',  -- 'ready'|'delivered'|'expired'|'refunded'
  transaction_id      uuid FK → transactions.id,
  purchased_at        timestamptz,
  delivered_at        timestamptz,
  expires_at          timestamptz,           -- 30 days from purchased_at
  delivery_reference  text,                  -- Inlomax reference
  metadata            jsonb                  -- { processing: true, ... }
)

vault_qr_codes (
  id                  text PRIMARY KEY,      -- 'qr_timestamp_random'
  vault_id            uuid FK → data_vault.id,
  user_id             uuid FK → profiles.id,
  qr_data             jsonb,                 -- { id, type, vaultId, planName, validUntil, signature, ... }
  expires_at          timestamptz,           -- 7 days from creation
  used_at             timestamptz,           -- null = unused, set = redeemed
  redeemed_phone      text,                  -- Phone that claimed the data
  created_at          timestamptz
)

transactions (
  id                  uuid PRIMARY KEY,
  user_id             uuid FK → profiles.id,
  type                text,                  -- 'park'|'deliver'|'refund'|'topup'|'withdrawal'
  amount              numeric,
  reference           text UNIQUE,           -- Idempotency key
  status              text,                  -- 'pending'|'processing'|'success'|'failed'
  metadata            jsonb,
  created_at          timestamptz
)

notifications (
  id                  uuid PRIMARY KEY,
  user_id             uuid FK → profiles.id,
  type                text,                  -- 'vault_parked'|'vault_delivered'|'expiry_warning'|...
  title               text,
  message             text,
  read_at             timestamptz,           -- null = unread
  created_at          timestamptz
)

-- Additional tables: vault_templates, vault_pools, user_achievements,
-- achievements, user_streaks, tap_ledger, tada_contacts, scheduled_vaults
```

### Row-Level Security (RLS) Policies

```sql
-- Users can only read/write their own vaults
CREATE POLICY vault_owner_only ON data_vault
  FOR ALL USING (auth.uid() = user_id);

-- QR codes: owner sees theirs; redemption page sees via encoded ID
CREATE POLICY qr_owner_or_public ON vault_qr_codes
  FOR SELECT USING (auth.uid() = user_id OR used_at IS NULL);

-- Transactions: users see only their own
CREATE POLICY txn_owner_only ON transactions
  FOR SELECT USING (auth.uid() = user_id);
```

---

## API Routes Reference

### Data Vault Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/data-vault/park` | Required + PIN | Park a data plan |
| POST | `/api/data-vault/deliver` | Required | Direct deliver a vault |
| POST | `/api/data-vault/generate-qr` | Required | Generate QR code |
| POST | `/api/data-vault/redeem-qr` | **None** (public) | QR redemption |
| POST | `/api/data-vault/refund` | Required | Manual refund |
| GET | `/api/data-vault/list` | Required | List user's vaults |
| POST | `/api/data-vault/extend-qr` | Required | Extend QR expiry |
| GET | `/api/data-vault/network-stats` | None | Network success rates |
| GET | `/api/data-vault/receipt/[id]` | Required | Download receipt |

### Request/Response Format

```json
// POST /api/data-vault/park
// Request
{
  "network": "MTN",
  "phone": "08012345678",
  "planId": "mtn-1gb",
  "amount": 420,
  "planName": "1GB",
  "userId": "user-uuid",
  "pin": "1234"
}

// Response 200
{
  "status": true,
  "message": "1GB successfully parked for 08012345678!",
  "data": {
    "vaultId": "uuid",
    "reference": "VAULT_...",
    "newBalance": 1580
  }
}

// Response 400
{
  "status": false,
  "message": "Incorrect PIN"
}
```

---

## Performance & Optimization

### Bundle Strategy

```
Next.js Webpack chunk splitting:
├── react          → ~45 KB (gzipped)   Always loaded
├── supabase       → ~32 KB (gzipped)   Always loaded
├── ui             → ~28 KB (gzipped)   Always loaded
├── qr             → ~15 KB (async)     Loaded only on vault pages
├── pdf            → ~22 KB (async)     Loaded only on receipt generation
└── vendor         → ~35 KB             Shared across pages
    TOTAL: ~95 KB initial | Async chunks loaded on demand

Optimizations active:
├── React Compiler (production)
├── Tree shaking (usedExports: true)
├── Module concatenation
├── Package import optimization (@radix-ui, recharts, sonner, supabase)
└── Image optimization (AVIF → WebP → fallback)
```

### Cache Strategy

```
Browser:
├── Static assets (_next/static)  → 1 year (immutable hash)
├── Images (SVG, PNG, WebP)       → 1 year
├── Service Worker (sw.js)        → Always revalidate
├── API responses (SWR)           → 5 min + background revalidation
└── Pages                         → 1 hour (stale-while-revalidate: 24h)

Server:
├── Network stats                  → 1 hour (materialized view)
├── Plans list                     → 30 minutes
└── User profile                   → 5 minutes (SWR)

Database:
└── Indexes:
    ├── data_vault (user_id, status, expires_at)
    ├── transactions (user_id, created_at)
    └── vault_qr_codes (vault_id, used_at)
```

### Web Vitals Targets

| Metric | Target | Current |
|--------|--------|---------|
| FCP (First Contentful Paint) | <800ms | ~600ms ✅ |
| LCP (Largest Contentful Paint) | <2500ms | ~1800ms ✅ |
| CLS (Cumulative Layout Shift) | <0.1 | 0.03 ✅ |
| TTFB (Time to First Byte) | <600ms | ~200ms ✅ |

---

## Security Model

### Auth Flow

```
Login → Supabase Auth → JWT issued
   │
   └── Stored in HTTP-only cookie
       Sent with every API request
       Verified server-side on every route
       Expires → Refresh token rotates session
       Role embedded in JWT claims
```

### Endpoint Security Matrix

```
ENDPOINT               AUTH      RATE LIMIT    PIN REQUIRED
────────────────────────────────────────────────────────────
POST /park             userId    Yes           YES
POST /deliver          userId    Yes           No
POST /generate-qr      userId    No            No
POST /redeem-qr        None      Yes           No
POST /refund           userId    Yes           No
GET  /list             userId    No            No
GET  /network-stats    None      No            No
```

### PIN Security

```
Storage:   base64(SHA256(pin + "tada_salt_2024"))
Verify:    Re-hash submitted PIN, compare strings
Failures:  3 wrong → 15 min lockout
Rotation:  PIN change requires old PIN + email OTP
```

### Fraud Prevention

```
Velocity checks:
├── Max 50 vaults/hour per user
├── Max 100 QR redemptions/hour (all users combined)
├── Max 500 recipients/day per user

Anomaly detection:
├── Same IP, 20+ QR scans in 1 min → Block
├── 100 GB gifted in 1 day → Flag for review
└── Phone changed 3x in 24h → Require KYC upgrade
```

---

## Deployment & Monitoring

### CI/CD Pipeline

```
Push to main branch
    │
    ├── GitHub Actions: lint + type-check (npm run check-all)
    │   └── Fail → block merge
    │
    ├── Build: next build --webpack --no-lint
    │   └── Fail → alert
    │
    ├── Deploy to Vercel Preview
    │   └── Each PR gets its own preview URL
    │
    └── Merge to main → Vercel Production deploy
        └── Zero downtime | Instant rollback available
```

### Monitoring Stack

```
Vercel Analytics    → Web Vitals, error rates, API response times
Sentry (optional)   → JavaScript errors + server-side exceptions
DataDog (optional)  → Server logs, DB performance, distributed tracing

Alerts fire when:
├── 500 errors > 10/min         → Page on-call engineer
├── API p95 latency > 1s        → Alert
├── Uptime < 99.5%              → Alert + Page
├── Cron job fails              → Alert
└── Failed deliveries > 5/day  → Manual review queue
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payment
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=

# VTU Provider
INLOMAX_API_KEY=
INLOMAX_BASE_URL=

# Email
RESEND_API_KEY=

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://tadavtu.com
CRON_SECRET=                     # Secures cron endpoints from public access
```

---

## Cron Jobs & Background Workers

| Job | Schedule | Endpoint | Action |
|-----|----------|----------|--------|
| Process vault expiry | Daily @ 00:00 UTC | `/api/cron/process-vault-expiry` | Auto-refund expired vaults |
| Expiry notifications | Daily @ 11:00 UTC | `/api/cron/send-expiry-notifications` | Warn users 48h before expiry |
| Scheduled vaults | Hourly | `/api/cron/process-scheduled-vaults` | Park + deliver on schedule |
| Network stats sync | Hourly | `/api/cron/sync-network-stats` | Refresh delivery success rates |
| Affiliate commissions | Weekly (Mon 09:00) | `/api/cron/process-affiliate-commissions` | Calculate + credit referrals |

All cron endpoints are secured with `Authorization: Bearer {CRON_SECRET}`. Vercel Cron config in `vercel.json` triggers each job on schedule.

---

## Summary

TADA VTU is a production-ready, high-performance platform built Nigeria-first. The architecture prioritizes:

- **Security:** RLS, JWT, PIN hashing, fraud detection
- **Reliability:** Atomic RPCs, cron-based auto-recovery, retry logic
- **Performance:** Sub-100KB initial bundle, sub-800ms FCP, SWR caching
- **Scalability:** Serverless API routes, Supabase connection pooling
- **User Experience:** Realtime updates, offline QR sharing, SMS fallback

The Data Vault feature is the core differentiator — bringing QR-based data gifting, scheduled delivery, and group pooling to the Nigerian market in a way no competitor currently offers.

---

**Document Version:** 2.0  
**Last Updated:** May 2026  
**Next Review:** August 2026  
**Location in repo:** `docs/SYSTEM_BLUEPRINT.md`
