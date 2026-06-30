# TADA VTU — Codebase Knowledge Graph Map

**Generated from:** codebase-memory-mcp (3,537 nodes, 8,106 edges)  
**Last updated:** 2026-06-30 (withdrawal/initiate route deleted; deposit_holds + failed_refunds tables added; release-deposit-holds + retry-failed-refunds crons added)

---

## Index

1. [Project Topology](#1-project-topology)
2. [Layered Architecture](#2-layered-architecture)
3. [API Route Inventory](#3-api-route-inventory)
4. [Data Flow & Pipeline Map](#4-data-flow--pipeline-map)
5. [Service Dependencies & Call Graph](#5-service-dependencies--call-graph)
6. [Database Schema (Supabase)](#6-database-schema-supabase)
7. [Go Financial Core](#7-go-financial-core)
8. [WhatsApp Bot Architecture](#8-whatsapp-bot-architecture)
9. [Module Index by Layer](#9-module-index-by-layer)
10. [File System Index](#10-file-system-index)
11. [Dead Code Inventory](#11-dead-code-inventory)

---

## 1. Project Topology

```
tada-vtu/  (Bun monorepo, workspaces: mobile, packages/*)
│
├── src/              Next.js 16 App (Vercel)
│   ├── app/          App Router pages + API routes
│   ├── components/   React components (shadcn, Radix UI)
│   ├── contexts/     React contexts (Auth, User, Theme, Notifications)
│   ├── hooks/        Custom React hooks
│   ├── lib/          Utilities, helpers, API clients
│   ├── scripts/      Utility scripts (Baileys, seed, etc.)
│   └── types/        TypeScript type definitions
│
├── services/
│   ├── core/         Go Financial Core (Go 1.22, Railway/standalone)
│   └── whatsapp/     Baileys WhatsApp bot (Node, Render)
│
├── supabase/         Database config
│   ├── migrations/   39+ SQL migrations
│   ├── functions/    Edge functions
│   └── schema.sql    Full schema
│
├── mobile/           React Native (Expo) app shell
├── packages/shared/  Shared workspace package
├── public/           Static assets (49 files: SVGs, icons, SW, fonts)
├── docs/             17 documentation files
└── scripts/          22 SQL/JS utility scripts
```

**Graph stats:** 3,537 nodes, 8,106 edges indexed across 4+ languages (TypeScript, Go, SQL, JSX).

---

## 2. Layered Architecture

The codebase-memory graph classifies code into layers:

### API Layer — has HTTP route definitions
| Directory | Fan-in | Description |
|-----------|--------|-------------|
| `src/app/api/*` | Various | All Next.js API route handlers |
| `services/core/cmd/server` | — | Go HTTP server, route registration |

### Core Layer — high fan-in, shared utilities
| Directory | Fan-in | Description |
|-----------|--------|-------------|
| `src/lib` | **705 in, 11 out** | Central utility library (largest fan-in) |
| `src/hooks` | 30 in, 23 out | React hooks |
| `src/contexts` | 11 in, 0 out | React context providers |
| `src/types` | 11 in, 0 out | TypeScript type definitions |

### Internal Layer
| Directory | Fan-in | Fan-out |
|-----------|--------|---------|
| `src/app` | 13 | 599 |
| `services/whatsapp` | 0 | 0 |
| `services/core/internal` | 7 | 13 |

### Entry Layer — only outbound calls
| Directory | Description |
|-----------|-------------|
| `src/components` | React components |
| `src/scripts` | Standalone scripts |
| `public/sw.js` | Service worker |

---

## 3. API Route Inventory

### 3.1 VTU Service Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/airtime/buy` | Purchase airtime |
| POST | `/api/data/buy` | Purchase data bundle |
| GET | `/api/data/plans` | List data plans |
| POST | `/api/eve/airtime` | Eve agent airtime purchase |
| POST | `/api/eve/data` | Eve agent data purchase |
| GET | `/api/data-plans` | Get data plans (merged provider) |
| POST | `/api/inlomax/airtime` | Inlomax airtime (internal) |
| POST | `/api/inlomax/data` | Inlomax data (internal) |
| POST | `/api/inlomax/cable` | Inlomax cable TV |
| POST | `/api/inlomax/betting` | Inlomax betting |
| GET | `/api/inlomax/services` | Inlomax available services |
| GET | `/api/inlomax/balance` | Inlomax provider balance |
| GET | `/api/inlomax/data-plans` | Inlomax data plans |
| GET | `/api/inlomax/transaction/[reference]` | Inlomax transaction status |
| POST | `/api/inlomax/webhook` | Inlomax callback webhook |

### 3.2 Wallet & Payment Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/wallet/balance` | Get user wallet balance |
| POST | `/api/flutterwave/initiate` | Initiate Flutterwave payment |
| GET | `/api/flutterwave/verify` | Verify payment reference |
| GET | `/api/flutterwave/fee-check` | Check Flutterwave fees |
| GET | `/api/flutterwave/virtual-account` | Get/create virtual account |
| POST | `/api/flutterwave/webhook` | Flutterwave payment webhook |

### 3.3 Data Vault Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/data-vault/park` | Park data for later delivery |
| GET | `/api/data-vault/list` | List user's vault items |
| POST | `/api/data-vault/deliver` | Deliver vault data |
| POST | `/api/data-vault/redeem-qr` | Redeem via QR code |
| POST | `/api/data-vault/generate-qr` | Generate QR code |
| POST | `/api/data-vault/extend-qr` | Extend QR expiry |
| GET | `/api/data-vault/network-stats` | Vault network stats |
| POST | `/api/data-vault/refund` | Refund vault item |
| POST | `/api/data-vault/usernames` | Vault usernames |
| POST | `/api/data-vault/pools/contribute` | Contribute to vault pool |
| GET | `/api/data-vault/receipt/[vaultId]` | Vault receipt |

### 3.4 Agent API Routes (WhatsApp bot surface)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/agent/health` | CORE_SECRET | Agent health check |
| GET | `/api/agent/transactions` | CORE_SECRET | User transaction history |
| GET | `/api/agent/user/balance` | CORE_SECRET | User balance |
| GET | `/api/agent/user/identify` | CORE_SECRET | Identify user by phone |
| GET | `/api/agent/user/check-email` | CORE_SECRET | Check email availability |
| GET | `/api/agent/user/check-phone` | CORE_SECRET | Check phone availability |
| GET | `/api/agent/user/link-whatsapp-pin` | CORE_SECRET | Generate link PIN |
| GET | `/api/agent/orders/create` | CORE_SECRET | Create order |
| GET | `/api/agent/orders/execute` | CORE_SECRET | Execute order |
| GET | `/api/agent/orders/[id]` | CORE_SECRET | Get order |
| GET | `/api/agent/orders/[id]/status` | CORE_SECRET | Order status |
| GET | `/api/agent/pricing` | CORE_SECRET | Get pricing |

### 3.5 WhatsApp Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/whatsapp/webhook` | Webhook receiver + bot bridge |
| POST | `/api/whatsapp/link` | Link WhatsApp number |

### 3.6 Auth & User Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/forgot-pin` | Forgot PIN |
| POST | `/api/auth/reset-pin` | Reset PIN |
| POST | `/api/user/change-password` | Change password |
| POST | `/api/user/reset-pin` | Reset PIN (authenticated) |
| GET | `/api/user/frequent-plans` | Frequent plans |

### 3.7 Admin Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/analytics` | Analytics data |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET/POST | `/api/admin/bot-mode` | Toggle bot mode (AI/menu) |
| GET | `/api/admin/flutterwave-history` | Flutterwave history |
| GET | `/api/admin/debug-plans` | Debug data plans |
| GET/POST | `/api/admin/provider-status` | Provider status |
| GET/POST | `/api/admin/users` | User management |
| POST | `/api/admin/login` | Admin login |

### 3.8 Cron Routes

| Method | Route | Frequency | Description |
|--------|-------|-----------|-------------|
| GET | `/api/cron/reconcile` | 15min (via bot) / daily (Vercel) | Reconcile stuck pending txns |
| GET | `/api/cron/release-deposit-holds` | Daily 1:00 AM UTC | Mark expired 3-day deposit holds as released |
| GET | `/api/cron/retry-failed-refunds` | Daily 2:00 AM UTC | Retry refunds that failed after a withdrawal/transfer failure |
| GET | `/api/cron/process-pending-transactions` | Daily | Process pending transactions |
| GET | `/api/cron/process-transfers` | Daily | Process pending transfers |
| GET | `/api/cron/process-vault-expiry` | Daily | Process expired vault items |
| GET | `/api/cron/verify-payments` | Daily | Verify pending payments |

### 3.9 Legacy v1 Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/airtime/buy` | Legacy airtime |
| POST | `/api/v1/data/buy` | Legacy data |
| GET | `/api/v1/data/plans` | Legacy data plans |
| GET | `/api/v1/wallet/balance` | Legacy balance |

### 3.10 Withdrawal Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/withdrawal/transfer` | Execute transfer (hardened: bcrypt PIN, daily caps, deposit hold check) |
| GET | `/api/withdrawal/banks` | List banks |
| POST | `/api/withdrawal/verify-account` | Verify bank account |

### 3.11 Miscellaneous Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/contacts` | Contacts |
| GET/POST | `/api/notifications` | Notifications |
| POST | `/api/push/send` | Send push notification |
| POST/DELETE | `/api/push/subscribe` | Push subscription |
| GET/POST/PATCH/DELETE | `/api/scheduled` | Scheduled purchases |

---

## 4. Data Flow & Pipeline Map

### 4.1 Airtime Purchase Flow

```
Client → POST /api/airtime/buy
  → src/app/api/airtime/buy/route.ts (POST)
    → src/lib/api/core.ts: coreDebit()
      ├── [primary] CORE_SECRET → Go Core POST /ledger/debit
      └── [fallback] Supabase rpc('atomic_debit', {...})
    → src/lib/api/inlomax.ts: purchaseAirtime()
    → [on failure] src/lib/api/core.ts: coreRefund()
```

### 4.2 WhatsApp Bot Message Flow

```
WhatsApp → Baileys (services/whatsapp/whatsapp-baileys.ts)
  → POST /api/whatsapp/webhook (CORE_SECRET)
    → src/lib/whatsapp/bridge.ts: processWhatsAppInboundMessage()
      → Check bot_config mode (AI or menu)
        ├── [AI mode] → src/lib/eve-client.ts: sendEveMessage()
        │   → Groq/DeepSeek LLM API
        │   → Tool execution via API routes
        └── [Menu mode] → handleMenuMessage()
            → State machine (menuSessions Map)
```

### 4.3 Flutterwave Deposit Flow

```
User → POST /api/flutterwave/initiate
  → Redirect to Flutterwave checkout
  → Flutterwave → POST /api/flutterwave/webhook
    → Verify HMAC signature
    → src/lib/api/core.ts: coreDeposit()
      ├── [primary] Go Core POST /ledger/deposit
      └── [fallback] Supabase rpc('atomic_deposit', {...})
    → Credit wallet, create notification
```

### 4.4 Bot Mode Toggle (Admin)

```
Admin Dashboard → POST /api/admin/bot-mode
  → Update supabase bot_config table (mode: 'ai' | 'menu')
  → bridge.ts reads bot_config on each inbound message
```

### 4.5 Reconcile Cron Flow

```
[Via Render Bot - every 15 min]
  services/whatsapp/whatsapp-baileys.ts → setInterval
    → fetch NEXT_APP_URL/api/cron/reconcile
      → Check stuck pending transactions
      → Auto-refund failed ones

[Via Vercel Cron - daily]
  VERCEL_CRON → GET /api/cron/reconcile
```

---

## 5. Service Dependencies & Call Graph

### 5.1 Key Hotspots (highest fan-in)

| Function | Fan-in | File |
|----------|--------|------|
| `toast.error` | 234 | `src/lib/toast.ts` |
| `toast.success` | 53 | `src/lib/toast.ts` |
| `cn()` | 68 | `src/lib/utils.ts` |
| `toISOString()` | 61 | `src/lib/date-utils.ts` |
| `createClient()` (browser) | 50 | `src/lib/supabase/client.ts` |
| `getUser()` | 30 | `src/lib/supabase/auth.ts` |
| `getSupabase()` | 28 | `src/lib/supabase/client.ts` |
| `createClient()` (server) | 27 | `src/lib/supabase/server.ts` |
| `MemoryCache.delete` | 25 | `src/lib/cache.ts` |

### 5.2 Cross-Service Call Graph

```
Next.js App (Vercel)
  │
  ├──→ Go Core (Railway)
  │     └── POST /ledger/debit, /ledger/deposit, /ledger/refund
  │     └── GET  /wallet/{id}/balance
  │     (All via CORE_SECRET bearer auth)
  │
  ├──→ Supabase (direct, service role key)
  │     └── RPC functions: atomic_debit, atomic_deposit, atomic_refund
  │     └── Tables: profiles, transactions, wallet_transactions, etc.
  │
  ├──→ Inlomax API (VTU provider)
  │     └── REST endpoints for airtime, data, cable, betting, electricity
  │
  ├──→ Flutterwave API (payment gateway)
  │     └── Payment initiation, verification, virtual accounts, webhooks
  │
  ├──→ Groq / DeepSeek (LLM)
  │     └── OpenAI-compatible chat completions for Eve AI agent
  │
  └──← Render Bot (Baileys)
        └── POST /api/whatsapp/webhook (CORE_SECRET auth)
        └── fetch /api/cron/reconcile (every 15 min)
```

### 5.3 Key Module Dependencies

```
src/lib/eve-client.ts
  → Groq/DeepSeek API (external LLM)
  → src/app/api/airtime/buy (via fetch)
  → src/app/api/data/buy (via fetch)
  → src/app/api/data-plans (via fetch)
  → src/app/api/agent/transactions (via fetch)
  → src/app/api/wallet/balance (via fetch)

src/lib/whatsapp/bridge.ts
  → src/lib/eve-client.ts (AI mode)
  → Supabase admin client (user lookup, bot_config)

src/lib/api/core.ts
  → Go Core HTTP (primary)
  → Supabase RPCs (fallback: atomic_debit, atomic_deposit, atomic_refund)

src/lib/api/inlomax.ts
  → Inlomax REST API (external VTU provider)

src/lib/api/flutterwave.ts
  → Flutterwave REST API (external payment gateway)
```

---

## 6. Database Schema (Supabase)

### 6.1 Core Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles, balance, whatsapp_number | Yes |
| `transactions` | All transaction records | Yes |
| `wallet_transactions` | Wallet audit trail | Yes |
| `beneficiaries` | Saved beneficiaries | Yes |
| `notifications` | User notifications | Yes |

### 6.2 Feature Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `data_vault` | Vault entries for parked data | Yes |
| `vault_qr_codes` | QR codes for vault items | Yes |
| `withdrawals` | Withdrawal requests | Yes |
| `referral_points` | Referral point balances | Yes |
| `referral_transactions` | Referral point history | Yes |
| `pricing_tiers` | User pricing tiers | Yes |
| `user_plan_preferences` | User plan preferences | Yes |
| `push_subscriptions` | Push notification subs | Yes |
| `scheduled_purchases` | Auto-recurring purchases | Yes |
| `reseller_api_keys` | Reseller API keys | Yes |

### 6.3 WhatsApp Bot Tables

| Table | Purpose |
|-------|---------|
| `baileys_sessions` | Baileys auth state (JSONB) |
| `whatsapp_pending_links` | Pending WhatsApp link codes |
| `bot_config` | Bot mode configuration (AI vs menu) |

### 6.4 Key RPC Functions

| RPC | Purpose |
|-----|---------|
| `atomic_debit` | Idempotent debit with balance lock, no-overdraft |
| `atomic_deposit` | Idempotent credit with FOR UPDATE lock |
| `atomic_refund` | Idempotent refund with original tx marking |
| `update_user_balance` | Direct balance update (legacy) |
| `process_expired_vault_items` | Auto-refund expired vault items |
| `spend_referral_points` | Deduct referral points |

### 6.5 Migration Index (Chronological)

| Migration | Description |
|-----------|-------------|
| `002_engagement_features.sql` | Engagement features |
| `003_withdrawals.sql` | Withdrawals system |
| `005_smart_features.sql` | Smart features |
| `009_add_transaction_types.sql` | Transaction type enums |
| `010_create_withdrawals_table.sql` | Withdrawals table |
| `011_create_update_balance_function.sql` | Balance update RPC |
| `012_pricing_tiers.sql` | Pricing tier system |
| `014_push_notifications.sql` | Push notifications |
| `015_add_metadata_column.sql` | Transaction metadata |
| `015_robust_withdrawal_initiation.sql` | Improved withdrawals |
| `016_system_settings_and_polling.sql` | System settings |
| `017_add_reset_otp_fields.sql` | Reset OTP |
| `018_create_data_vault.sql` | Data vault initial |
| `018_pending_purchases_system.sql` | Pending purchases |
| `019_fix_security_issues.sql` | Security fixes |
| `021_improve_vault_refunding.sql` | Vault refund improvements |
| `023_create_vault_qr_codes.sql` | Vault QR codes |
| `024_cleanup_gift_system.sql` | Cleanup gift system |
| `025_cleanup_favorites_system.sql` | Cleanup favorites |
| `026_cleanup_cable_electricity.sql` | Remove cable/electricity |
| `027_final_cleanup_betting.sql` | Final cleanup betting |
| `028_add_whatsapp_linking.sql` | WhatsApp linking |
| `028_user_analytics_tables.sql` | Analytics tables |
| `029_data_vault_improvements.sql` | Data vault improvements |
| `030_allow_refund_transactions.sql` | Allow refund txns |
| `030_data_vault_feature_expansion.sql` | Vault feature expansion |
| `031_upsert_plan_preference_rpc.sql` | Plan preference RPC |
| `032_add_plan_type_to_preferences.sql` | Plan type in prefs |
| `033_add_whatsapp_session_token.sql` | WhatsApp session token |
| `034_create_reconciliation_entries.sql` | Reconciliation entries |
| `035_idempotency_and_atomic_debit.sql` | Idempotency + atomic debit |
| `036_atomic_deposit_and_rls.sql` | Atomic deposit + RLS |
| `037_create_baileys_sessions.sql` | Baileys session storage |
| `038_add_whatsapp_lid.sql` | WhatsApp LID support |
| `039_create_bot_config.sql` | Bot mode config table |

---

## 7. Go Financial Core

### 7.1 Service Structure

```
services/core/
├── cmd/server/main.go          HTTP entrypoint: route registration, health checks
├── go.mod                      Go 1.22, dependency: joho/godotenv
└── internal/
    ├── vtu/handlers.go         Production routes: Deposit, Debit, Refund, Balance
    ├── store/supabase.go       Supabase client + atomic RPC wrappers
    ├── ledger/ledger.go        In-memory ledger (simulation only)
    ├── engine/service.go       Workflow orchestration (transfer, refund, deposit)
    ├── transactions/service.go Intent lifecycle management
    ├── runs/service.go         Execution-run tracking
    ├── accounts/service.go     Account management
    ├── reconciliation/         Reconciliation entry creation
    ├── providers/              Provider abstraction + mock execution
    ├── merchant/               Merchant registration (scaffold)
    ├── offline/                Offline event creation
    ├── middleware/             Auth middleware (RequireInternalAuth)
    ├── errors/                 Shared error types (empty)
    └── log/                    Shared logger (empty)
```

### 7.2 Production API Surface

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/health` | GET | None | Service health check |
| `/ledger/deposit` | POST | CORE_SECRET | Atomic, idempotent credit |
| `/ledger/debit` | POST | CORE_SECRET | Atomic, idempotent, no-overdraft |
| `/ledger/refund` | POST | CORE_SECRET | Atomic, idempotent refund |
| `/wallet/{id}/balance` | GET | CORE_SECRET | Read balance |

### 7.3 Simulation API Surface

| Route | Method | Description |
|-------|--------|-------------|
| `/sim/accounts` | POST | Create in-memory account |
| `/sim/balances` | GET | Read in-memory balance |
| `/sim/transfers` | POST | Simulate transfer |
| `/sim/refunds` | POST | Simulate refund |
| `/sim/intents` | POST | Create intent |
| `/sim/merchants` | POST | Create merchant |
| `/sim/offline-events` | POST | Create offline event |

### 7.4 Key Design: Core Client with Fallback

```
src/lib/api/core.ts:
  coreDebit()    → Try Go Core POST /ledger/debit → fallback to Supabase rpc('atomic_debit')
  coreDeposit()  → Try Go Core POST /ledger/deposit → fallback to Supabase rpc('atomic_deposit')
  coreRefund()   → Try Go Core POST /ledger/refund → fallback to Supabase rpc('atomic_refund')
  coreBalance()  → Try Go Core GET /wallet/{id}/balance → fallback to profiles table
```

---

## 8. WhatsApp Bot Architecture

### 8.1 Component Overview

```
Render (Background Worker)            Vercel (Next.js)
┌─────────────────────┐              ┌──────────────────────────────┐
│ whatsapp-baileys.ts │──HTTP POST──→│ /api/whatsapp/webhook        │
│  • Baileys socket   │  (CORE_SECRET)│ → bridge.ts                  │
│  • Message handler  │              │   → user lookup (Supabase)   │
│  • LID resolution   │              │   → bot mode check           │
│  • Reconnect logic  │              │   ├── AI: eve-client.ts      │
│  • Health endpoint  │              │   │   → Groq/DeepSeek LLM    │
│  • 15-min reconcile │              │   │   → Tool execution       │
│  • QR pairing       │              │   └── Menu: state machine    │
└─────────────────────┘              │   → reply text               │
                                     └──────────────────────────────┘
```

### 8.2 Bot Mode Decision Flow

```
bridge.ts:processWhatsAppInboundMessage()
  → Look up profile by whatsapp_number
  → If not found → send link code
  → If found:
      → Read bot_config.mode
      → If 'menu' → handleMenuMessage() (state machine)
      → If 'ai' → sendEveMessage() (Groq/DeepSeek)
```

### 8.3 Key Files

| File | Role |
|------|------|
| `services/whatsapp/whatsapp-baileys.ts` | Baileys socket, message handler, health HTTP, reconcile cron |
| `services/whatsapp/supabase-auth.ts` | `useSupabaseAuthState()` — persist Baileys auth in DB |
| `services/whatsapp/seed-session.ts` | Pre-seed Baileys session from Supabase |
| `src/lib/whatsapp/bridge.ts` | Entry point: user lookup, mode check, AI/menu routing |
| `src/lib/whatsapp/supabase-auth.ts` | Baileys auth state provider (JSONB storage) |
| `src/lib/eve-client.ts` | Eve AI agent: Groq/DeepSeek, tool definitions, session mgmt |
| `src/lib/agent-auth.ts` | Auth middleware using CORE_SECRET |
| `src/lib/agent-utils.ts` | Phone normalization, response formatting |
| `src/lib/rate-limit.ts` | Per-user rate limiting for agent endpoints |
| `src/app/api/whatsapp/webhook/route.ts` | Webhook receiver, bridge call, rate limiting |
| `src/app/api/agent/*` | User info, orders, transactions, pricing endpoints |

---

## 9. Module Index by Layer

### 9.1 Core Library (`src/lib/`)

#### Inter-service Communication
| File | Key Exports | Purpose |
|------|-------------|---------|
| `api/core.ts` | `coreBalance`, `coreDebit`, `coreRefund`, `coreDeposit` | Go Core HTTP bridge + Supabase fallback |
| `api/inlomax.ts` | `purchaseAirtime`, `purchaseData`, ... | VTU provider client |
| `api/flutterwave.ts` | Flutterwave payment operations | Payment gateway client |
| `api/deposit-processor.ts` | Deposit orchestration | Wallet funding via Flutterwave |
| `api/flutterwave-transfer.ts` | Transfer operations | Bank withdrawal payouts |
| `api/webhooks.ts` | Webhook delivery | Outbound webhook system |

#### Data & Caching
| File | Key Exports | Purpose |
|------|-------------|---------|
| `cache.ts` | `MemoryCache` | In-memory TTL cache |
| `api/merged-data-plans.ts` | `getMergedDataPlans`, `getNetworkPlans`, `getBestDeals` | Cached data plans |
| `api/provider-router.ts` | `getServices`, `getProviderStatus` | Provider routing |

#### Auth & Security
| File | Key Exports | Purpose |
|------|-------------|---------|
| `agent-auth.ts` | `withAgentAuth`, `validateAgentAuth` | CORE_SECRET middleware |
| `auth-helpers.ts` | `isClient`, auth utilities | Basic auth helpers |
| `auth-protection.ts` | Rate limiting, brute-force protect | Auth endpoint protection |
| `admin-auth.ts` | Admin password hashing/verification | Admin auth |
| `webhook-security.ts` | HMAC signature verification | Webhook security |
| `rate-limiter.ts` | Rate limiting with lockout | Auth brute-force protection |
| `rate-limit.ts` | Simple per-route rate limiter | API rate limits |

#### WhatsApp Bot
| File | Key Exports | Purpose |
|------|-------------|---------|
| `whatsapp/bridge.ts` | `processWhatsAppInboundMessage`, `normalizeWhatsAppNumber` | Main bot bridge |
| `whatsapp/supabase-auth.ts` | `useSupabaseAuthState` | Baileys session persistence |
| `eve-client.ts` | `sendEveMessage` | Eve AI agent (Groq/DeepSeek) |
| `agent-utils.ts` | `agentSuccess`, `agentError`, `normalizeNigerianPhone` | Agent utilities |

#### Presentation & UI Helpers
| File | Key Exports | Purpose |
|------|-------------|---------|
| `utils.ts` | `cn()` | Tailwind class merge |
| `toast.ts` | `toast.success`, `toast.error`, `toast.payment` | Sonner toast wrapper |
| `date-utils.ts` | `toISOString`, date formatters | Date formatting |
| `qr-generator.ts` | QR code generation | Data vault QR codes |
| `validation.ts` | `pinSchema`, `phoneSchema`, `validateFormData` | Zod validation schemas |
| `constants.ts` | App constants | Feature flags, provider configs |
| `pricing.ts` | Pricing configuration | Cost + selling prices |
| `email.ts` | Email via Resend | Notification emails |

### 9.2 Supabase Layer

| File | Key Exports | Purpose |
|------|-------------|---------|
| `supabase/client.ts` | `createClient` (browser, singleton) | Frontend Supabase client |
| `supabase/server.ts` | `createClient` (server, cookie-based) | Server-side Supabase |
| `supabase/admin.ts` | `createAdminClient` (service role) | Admin Supabase (bypass RLS) |
| `supabase/auth.ts` | `getUser`, auth helpers | Client-side auth |
| `supabase/middleware.ts` | Supabase middleware | Next.js middleware |

### 9.3 React Hooks

| File | Key Exports | Purpose |
|------|-------------|---------|
| `hooks/useAuth.ts` | Auth state hook | Session management |
| `hooks/useUser.ts` | User profile data | User data access |
| `hooks/useBalance.ts` | Wallet balance | Balance queries |
| `hooks/useTransactions.ts` | Transaction list | Transaction queries |
| `hooks/usePush.ts` | Push notifications | Push notification state |
| `hooks/useLocalStorage.ts` | Local storage | Persistent client state |
| `hooks/useDataPlans.ts` | Data plans | SWR-based plan fetching |

### 9.4 React Contexts

| File | Key Exports | Purpose |
|------|-------------|---------|
| `contexts/AuthContext.tsx` | `AuthProvider`, `useAuth` | Auth state (NO CONSUMERS — dead) |
| `contexts/UserContext.tsx` | User context | User profile |
| `contexts/ThemeContext.tsx` | Theme context | Dark/light mode |
| `contexts/NotificationContext.tsx` | Notification context | Toast notifications |

### 9.5 UI Components

| Directory | Purpose |
|-----------|---------|
| `components/ui/` | shadcn/ui + Radix primitives: button, card, dialog, select, tabs, etc. |
| `components/admin/` | Admin dashboard components |
| `components/dashboard/` | Main dashboard components |
| `components/forms/` | Form components (AirtimeForm, DataForm, etc.) |
| `components/layouts/` | Navbar, Sidebar, Footer, AuthLayout |
| `components/providers/` | AuthProvider, ThemeProvider, QueryProvider |
| `components/icons/` | Custom animated icon components |

---

## 10. File System Index

### 10.1 Source Files (`src/`)

```
src/
├── app/                              # Pages & route handlers
│   ├── admin/                        # Admin panel pages
│   ├── api/                          # API route handlers (78 route files)
│   │   ├── admin/                    # Admin API (5 route groups)
│   │   ├── agent/                    # WhatsApp bot agent API (12 route files)
│   │   ├── airtime/                  # Airtime purchase
│   │   ├── analytics/                # Analytics tracking
│   │   ├── auth/                     # Authentication
│   │   ├── contacts/                 # Contacts
│   │   ├── cron/                     # Scheduled jobs (5 routes)
│   │   ├── data/                     # Data purchase
│   │   ├── data-plans/               # Merged data plans
│   │   ├── data-vault/               # Data vault (11 route groups)
│   │   ├── eve/                      # Eve agent execution (2 routes)
│   │   ├── flutterwave/              # Payment routes (5 route groups)
│   │   ├── health/                   # Health check
│   │   ├── inlomax/                  # Provider proxy (8 route groups)
│   │   ├── notifications/            # Notifications
│   │   ├── push/                     # Push notifications
│   │   ├── referral/                 # Referral system
│   │   ├── reseller/                 # Reseller API
│   │   ├── scheduled/                # Scheduled purchases
│   │   ├── transaction/              # Transaction lookup
│   │   ├── user/                     # User management
│   │   ├── v1/                       # Legacy v1 routes
│   │   ├── vault-templates/          # Vault message templates
│   │   ├── wallet/                   # Wallet/balance
│   │   ├── whatsapp/                 # WhatsApp bot (2 routes)
│   │   └── withdrawal/               # Withdrawals (4 routes)
│   ├── auth/                         # Auth pages (login, register, etc.)
│   ├── dashboard/                    # Dashboard pages
│   ├── vault/                        # Data vault UI
│   ├── pricing/                      # Pricing page
│   ├── link-whatsapp/                # WhatsApp linking page
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   ├── globals.css                   # Global styles
│   ├── error.tsx                     # Error boundary
│   └── not-found.tsx                 # 404 page
│
├── components/                       # React components
│   ├── ui/                           # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── radio.tsx                 # Animated radio icon (Dead: startAnimation/stopAnimation refs)
│   │   ├── eye-icon.tsx              # Animated eye icon (Dead: startAnimation/stopAnimation refs)
│   │   ├── eye-off-icon.tsx          # Animated eye-off icon (Dead: startAnimation/stopAnimation refs)
│   │   ├── zap.tsx                   # Animated zap icon (Dead: startAnimation/stopAnimation refs)
│   │   ├── hourglass.tsx             # Animated hourglass icon (Dead: startAnimation/stopAnimation refs)
│   │   ├── send.tsx                  # Animated send icon (Dead: startAnimation/stopAnimation refs)
│   │   └── ... (other shadcn-ui components)
│   ├── icons/                        # Icon utilities
│   ├── dashboard/                    # Dashboard-specific components
│   ├── forms/                        # Form components
│   ├── layouts/                      # Layout components
│   └── providers/                    # React context providers
│
├── contexts/                         # React contexts
│   ├── AuthContext.tsx               # Auth state (DEAD — no consumers)
│   ├── UserContext.tsx               # User profile
│   ├── ThemeContext.tsx               # Dark/light theme
│   └── NotificationContext.tsx        # Toast notifications
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts                    # Auth state
│   ├── useUser.ts                    # User data
│   ├── useBalance.ts                 # Wallet balance
│   ├── useTransactions.ts            # Transaction history
│   ├── usePush.ts                    # Push notifications
│   ├── useLocalStorage.ts            # Local storage
│   ├── useDataPlans.ts               # Data plans (SWR)
│   └── useNetworkStatus.ts           # Network status (DEAD — no callers)
│
├── lib/                              # Core library (705 fan-in)
│   ├── api/                          # API clients & bridges
│   │   ├── core.ts                   # Go Core client (with Supabase fallback)
│   │   ├── inlomax.ts               # VTU provider client
│   │   ├── flutterwave.ts            # Payment gateway client
│   │   ├── flutterwave-transfer.ts   # Bank transfer payouts
│   │   ├── deposit-processor.ts      # Deposit orchestration
│   │   ├── merged-data-plans.ts      # Cached data plans
│   │   ├── provider-router.ts        # Provider health/selection
│   │   ├── reseller-auth.ts          # Reseller API auth
│   │   ├── user.ts                   # User data helpers
│   │   └── webhooks.ts               # Outbound webhook system
│   ├── supabase/                     # Supabase client config
│   │   ├── client.ts                 # Browser client (singleton)
│   │   ├── server.ts                 # Server client (cookies)
│   │   ├── admin.ts                  # Admin client (service role)
│   │   ├── auth.ts                   # Client auth helpers
│   │   └── middleware.ts             # Next.js middleware helper
│   ├── whatsapp/                     # WhatsApp bot bridge
│   │   ├── bridge.ts                 # Main bot bridge (AI + menu routing)
│   │   └── supabase-auth.ts          # Baileys session persistence
│   ├── agent-auth.ts                 # CORE_SECRET middleware
│   ├── agent-utils.ts                # Agent API response helpers
│   ├── api-utils.ts                  # Retry/timeout utilities
│   ├── auth-helpers.ts              # Auth helpers
│   ├── auth-protection.ts            # Rate limiting
│   ├── admin-auth.ts                 # Admin password auth
│   ├── eve-client.ts                 # Eve AI agent (Groq/DeepSeek)
│   ├── cache.ts                      # In-memory cache
│   ├── toast.ts                      # Sonner toast wrapper
│   ├── utils.ts                      # cn() utility
│   ├── validation.ts                 # Zod schemas
│   ├── constants.ts                  # App constants
│   ├── date-utils.ts                 # Date formatting
│   ├── pricing.ts                    # Pricing config
│   ├── email.ts                      # Resend email service
│   ├── qr-generator.ts               # QR code generation
│   ├── push-notifications.ts         # Push notification service
│   ├── webhook-security.ts           # HMAC signature verification
│   ├── rate-limiter.ts               # Brute-force protection
│   ├── rate-limit.ts                 # Per-route rate limiter
│   ├── scheduled-purchases.ts        # Auto-recurring purchase logic
│   ├── swr-fetcher.ts                # SWR fetch wrapper
│   ├── circuit-breaker.ts            # DEAD — no callers
│   ├── cashback.ts                   # DEAD — no callers
│   ├── cache-config.ts               # DEAD — no callers
│   ├── notify.ts                     # DEAD — no callers
│   ├── pricing-tiers.ts             # DEAD — no callers
│   ├── smart-toast.ts               # DEAD — no callers
│   └── stateful-vtu-wrapper.ts       # DEAD — no callers
│
├── types/                            # TypeScript definitions
│   ├── database.ts                   # Database row types
│   ├── api.ts                       # API request/response types
│   └── index.ts                     # Re-exports
│
├── scripts/                          # Utility scripts
│   ├── whatsapp-baileys.ts           # Run Baileys bot locally
│   └── seed-baileys-session.ts       # Pre-seed session from Supabase
│
└── middleware.ts                     # Next.js edge middleware
```

### 10.2 Go Core Files (`services/core/`)

```
services/core/
├── cmd/server/main.go                 # Server entrypoint, route registration
├── internal/
│   ├── vtu/handlers.go                # PRODUCTION: Deposit, Debit, Refund, Balance
│   ├── store/supabase.go              # Supabase client + AtomicDebit/Deposit/Refund
│   ├── ledger/ledger.go               # In-memory ledger (simulation)
│   ├── engine/service.go              # Abstract engine orchestration
│   ├── transactions/service.go        # Intent lifecycle
│   ├── runs/service.go                # Run tracking
│   ├── accounts/service.go            # Account management
│   ├── reconciliation/service.go      # Reconciliation entries
│   ├── providers/provider.go          # Provider abstraction
│   ├── merchant/service.go            # Merchant scaffold
│   ├── offline/service.go             # Offline events
│   ├── middleware/auth.go             # RequireInternalAuth
│   ├── middleware/handler.go          # Handler helpers
│   ├── tests/integration_test.go      # Integration tests
│   ├── errors/                        # (empty)
│   └── log/                           # (empty)
├── go.mod                             # Go 1.22, godotenv dep
└── go.sum
```

### 10.3 Baileys Bot Files (`services/whatsapp/`)

```
services/whatsapp/
├── whatsapp-baileys.ts                # Main process (Baileys socket, health, reconcile cron)
├── supabase-auth.ts                   # useSupabaseAuthState() — persist auth in DB
├── seed-session.ts                    # Pre-seed session helper
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript config
```

### 10.4 Supabase Files (`supabase/`)

```
supabase/
├── schema.sql                         # Full database schema
├── migrations/                        # 39+ SQL migration files
│   ├── 002_engagement_features.sql
│   ├── 003_withdrawals.sql
│   ├── 005_smart_features.sql
│   ├── 009_add_transaction_types.sql
│   ├── 010_create_withdrawals_table.sql
│   ├── 011_create_update_balance_function.sql
│   ├── 012_pricing_tiers.sql
│   ├── 014_push_notifications.sql
│   ├── 015_add_metadata_column.sql
│   ├── 015_robust_withdrawal_initiation.sql
│   ├── 016_system_settings_and_polling.sql
│   ├── 017_add_reset_otp_fields.sql
│   ├── 018_create_data_vault.sql
│   ├── 018_pending_purchases_system.sql
│   ├── 019_fix_security_issues.sql
│   ├── 021_improve_vault_refunding.sql
│   ├── 023_create_vault_qr_codes.sql
│   ├── 024_cleanup_gift_system.sql
│   ├── 025_cleanup_favorites_system.sql
│   ├── 026_cleanup_cable_electricity.sql
│   ├── 027_final_cleanup_betting.sql
│   ├── 028_add_whatsapp_linking.sql
│   ├── 028_user_analytics_tables.sql
│   ├── 029_data_vault_improvements.sql
│   ├── 030_allow_refund_transactions.sql
│   ├── 030_data_vault_feature_expansion.sql
│   ├── 031_upsert_plan_preference_rpc.sql
│   ├── 032_add_plan_type_to_preferences.sql
│   ├── 033_add_whatsapp_session_token.sql
│   ├── 034_create_reconciliation_entries.sql
│   ├── 035_idempotency_and_atomic_debit.sql
│   ├── 036_atomic_deposit_and_rls.sql
│   ├── 037_create_baileys_sessions.sql
│   ├── 038_add_whatsapp_lid.sql
│   ├── 039_create_bot_config.sql
│   ├── 20240227_data_vault_system.sql
│   ├── 20241231_fix_create_reservation_rpc.sql
│   ├── 20241231_fix_idempotent_reservation.sql
│   ├── 20241231_update_create_reservation_user_id.sql
│   ├── add-park-data-vault-function.sql
│   ├── add_temp_virtual_accounts_support.sql
│   ├── add_virtual_accounts.sql
│   ├── create_performance_metrics_table.sql
│   └── fix_virtual_accounts_bvn_validation.sql
└── functions/
    ├── create_reservation.sql
    └── generate_temp_token.sql
```

---

## 11. Dead Code Inventory

### 11.1 Entire Files — Zero Imports, Safe to Delete

| File | Size | Functions/Exports |
|------|------|-------------------|
| `src/lib/cache-config.ts` | ~30 lines | `CACHE_BUSTING` object |
| `src/lib/smart-toast.ts` | ~60 lines | `smartErrorToast`, `smartSuccessToast`, `smartPaymentToast`, `smartWarningToast`, `smartInfoToast` |
| `src/lib/pricing-tiers.ts` | ~200 lines | `getUserTier`, `getTierDisplay`, `calculateAirtimePrice`, `calculateDataPrice`, `getAirtimeDiscount`, `getDataDiscount` |
| `src/lib/stateful-vtu-wrapper.ts` | ~50 lines | `handleWhatsAppMessage`, `VTUResponse` (OpenClaw legacy wrapper) |
| `src/lib/circuit-breaker.ts` | ~120 lines | `CircuitBreaker`, `EnhancedVTUService`, `getCircuitBreakerHealth` |
| `src/lib/cashback.ts` | ~100 lines | `calculateCashback`, `getCashbackPreview`, `calculateTotalCashback`, `getCashbackLevel` |
| `src/lib/notify.ts` | ~90 lines | `notifyUser`, `notifyTransactionSuccess`, `notifyTransactionFailed`, `notifyGiftReceived`, `notifyLowBalance`, `notifyPromo`, `notifyDailyTip` |

### 11.2 Dead Functions in Otherwise-Used Files

| File | Dead Function | Reason |
|------|--------------|--------|
| `src/lib/validation.ts` | `sanitizeInput()` | Exported, but nothing imports it |
| `src/lib/api-utils.ts` | `withTimeout()` | Exported, but `merged-data-plans.ts` only imports `withRetry` |
| `src/lib/api/merged-data-plans.ts` | `resetProviderCircuit()` | Exported, but never imported |
| `src/lib/scheduled-purchases.ts` | `shouldRunNow()` | 6 other functions imported, but not this one |
| `src/hooks/useNetworkStatus.ts` | `useNetworkStatus()` | Entire hook — 97 lines, no callers |
| `src/lib/cache.ts` | `cacheKeys.services` | Object property, never referenced outside file |

### 11.3 Dead `startAnimation`/`stopAnimation` Refs

These icon components are **used** in the UI, but their `useImperativeHandle` exposed `startAnimation()` and `stopAnimation()` methods have **zero callers** — animations are driven entirely by internal mouse event handlers (`onMouseEnter`/`onMouseLeave`):

| File | Dead Refs |
|------|-----------|
| `src/components/ui/radio.tsx` | `RadioIconHandle` — `startAnimation`, `stopAnimation` |
| `src/components/ui/eye-icon.tsx` | `EyeIconHandle` — `startAnimation`, `stopAnimation` |
| `src/components/ui/eye-off-icon.tsx` | `EyeOffIconHandle` — `startAnimation`, `stopAnimation` |
| `src/components/ui/zap.tsx` | `ZapHandle` — `startAnimation`, `stopAnimation` |
| `src/components/ui/hourglass.tsx` | `HourglassHandle` — `startAnimation`, `stopAnimation` |
| `src/components/ui/send.tsx` | `SendHandle` — `startAnimation`, `stopAnimation` |

### 11.4 Dead Context Consumers

| File | Pattern | Status |
|------|---------|--------|
| `src/contexts/AuthContext.tsx` | `AuthProvider` + `useAuth()` | **Zero consumers.** No file imports `useAuth` or wraps with `AuthProvider`. |

---

## Graph Query Quick Reference

When searching the codebase with codebase-memory-mcp:

```bash
# Index a repository
codebase-memory-mcp cli index_repository '{"repo_path": "C:/path/to/repo"}'

# List indexed projects
codebase-memory-mcp cli list_projects

# Search for functions by name pattern
codebase-memory-mcp cli search_graph '{"name_pattern": ".*coreDebit.*", "label": "Function"}'

# Find functions with no callers (dead code candidates)
codebase-memory-mcp cli search_graph '{"label":"Function","min_degree":0,"max_degree":0}'

# Trace call path for a function
codebase-memory-mcp cli trace_call_path '{"function_name":"coreDebit","direction":"both"}'

# Get architecture overview
codebase-memory-mcp cli get_architecture '{"aspects":["all"]}'

# Detect uncommitted changes impact
codebase-memory-mcp cli detect_changes

# Launch 3D UI
codebase-memory-mcp --ui=true --port=9749
```
