# TADAPAY — Project Status

**Last Updated:** June 22, 2026  
**Architecture:** Multi-service monorepo (Next.js web, Go Financial Core, Eve agent, React Native mobile, shared packages)

---

## System Map

```
tada-vtu/
├── src/                  Next.js 15 — web app + API routes (deployed on Vercel)
├── services/core/        Go Financial Core — the money truth layer
├── eve-agent/            Eve AI agent — natural language interface (scaffolding)
├── mobile/               React Native (Expo) — mobile app (scaffolding)
├── packages/shared/      Shared constants and types
└── supabase/migrations/  32 database migrations
```

---

## What Is Actually Production-Ready

### ✅ Next.js Web App (src/)
Fully functional. All VTU purchases, wallet funding, withdrawals, and UI are
wired to the Go Core for money operations.

- Airtime purchase (MTN, Airtel, Glo, 9mobile)
- Data bundle purchase
- Cable TV subscriptions (DStv, GOtv, Startimes)
- Electricity payments
- Betting wallet top-ups
- Wallet funding via Flutterwave
- Bank withdrawals
- Data Vault (park data, QR code, auto-refund)
- Scheduled / recurring purchases (cron-driven)
- Transaction history and receipts
- Referral program, loyalty system, achievements
- Admin dashboard (analytics, user management, transaction monitoring)
- Push notifications
- Beneficiary management
- PIN verification for sensitive operations
- Rate limiting and brute-force protection

### ✅ Go Financial Core — VTU Handlers (services/core/internal/vtu/)
Real, Supabase-backed. This is the only path that moves real money.

| Endpoint | What it does |
|---|---|
| `POST /ledger/deposit` | Credits user wallet (idempotent, atomic via Supabase RPC) |
| `POST /ledger/debit` | Debits wallet before provider call, enforces no-overdraft |
| `POST /ledger/refund` | Credits back on provider failure, marks original tx failed |
| `GET /wallet/{id}/balance` | Reads live balance from Supabase |
| `GET /health` | Service health check |

All protected by `CORE_SECRET` shared-key auth.

### ✅ Supabase Schema (supabase/migrations/)
32 migrations applied. Key tables: `profiles`, `transactions`, `wallet_transactions`,
`beneficiaries`, `notifications`, `gift_cards`, `data_vault`, `scheduled_purchases`,
`achievements`, `user_achievements`, `user_sessions`, `user_plan_preferences`.

Atomic balance operations go through the `update_user_balance` RPC.

---

## What Is Scaffolding (Exists But Does Not Work in Production)

### ⚠️ Go Core — Abstract Engine (services/core/internal/engine/, ledger/, runs/, etc.)
In-memory only. All state is wiped on every Core restart. These are the
building blocks for the future double-entry ledger system, NOT for production use.

Critical: the abstract engine endpoints are prefixed `/sim/` to make this explicit:
- `POST /sim/transfers` — simulates a transfer in memory, does NOT touch Supabase
- `POST /sim/refunds` — simulates a refund in memory, does NOT touch Supabase
- `POST /sim/intents` — creates an in-memory intent, does NOT touch Supabase

**Do not call `/sim/*` routes from production code. They do not move money.**

### ⚠️ Go Core — Reconciliation (services/core/internal/reconciliation/)
Creates `"pending"` entries in memory. There is no background worker or cron
that ever calls `Resolve()`. Entries pile up as pending until restart.
Needs: a Supabase-backed reconciliation table + a cron or webhook to resolve entries.

### ⚠️ Go Core — Offline Service (services/core/internal/offline/)
26-line stub. Only has `CreateEvent(id, kind)`. None of the vision is implemented:
- No Offline Capability Token (OCT) issuance
- No cryptographic signing
- No offline budget manager
- No device binding
- No sync/reconciliation endpoint
- No double-spend protection

The full offline design (OCT → signed payment proofs → sync → ledger posting)
requires significant work before it is safe to ship. See design docs for spec.

### ⚠️ Go Core — Providers (services/core/internal/providers/)
Mock provider only. The real VTU providers (Inlomax, etc.) are wired in the
Next.js API routes, not in the Core provider registry. The abstract engine
therefore cannot call real providers.

### ⚠️ Go Core — Accounts / Merchant (services/core/internal/accounts/, merchant/)
In-memory stubs. No persistence. TadaTag identity and merchant settlement
systems described in the vision are not yet started.

### ❌ Eve Agent (eve-agent/)
Framework scaffold only. `agent.ts` is:
```ts
export default defineAgent({ model: "anthropic/claude-sonnet-4.6" });
```
The instructions.md defines the personality and tool descriptions, but no tools
are implemented. The agent cannot check balances, buy airtime, or execute
anything. This needs tool implementations wired to the Core VTU endpoints.

### ❌ Mobile App (mobile/)
Expo scaffold with a static screen. Displays NETWORKS and SERVICE_TYPES from
`@tadapay/shared`. Not connected to Core or Supabase. No auth, no wallet,
no purchase flow.

---

## Architecture: Two Ledger Systems (Important)

The Core runs two completely separate systems:

```
┌──────────────────────────────────────────────────────┐
│  REAL MONEY (Supabase-backed)                        │
│  POST /ledger/deposit                                │
│  POST /ledger/debit          ← Next.js calls these   │
│  POST /ledger/refund                                 │
│  GET  /wallet/{id}/balance                           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  SIMULATION (in-memory, wiped on restart)            │
│  POST /sim/transfers                                 │
│  POST /sim/refunds           ← DO NOT use for money  │
│  POST /sim/intents                                   │
│  POST /sim/accounts                                  │
│  POST /sim/merchants                                 │
└──────────────────────────────────────────────────────┘
```

---

## Next Steps (Priority Order)

### 1. Deploy Core to Production (Blocking everything)
Core currently only runs on `localhost:8080`. Nothing works outside your
laptop until it is deployed. Recommended: Railway (Go native, $5/mo).
Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORE_SECRET`, `CORE_PORT`.

### 2. Wire Eve Agent Tools
Minimum viable: balance check + airtime purchase + data purchase.
Each tool calls the Core VTU endpoints. This makes Eve actually useful.

### 3. Mobile App Auth + Wallet Screen
Minimum viable: Supabase auth, balance display, airtime purchase flow.

### 4. Reconciliation Worker
Add a Supabase table for reconciliation entries and a cron endpoint (or
Postgres trigger) to mark transactions as reconciled after provider confirmation.

### 5. Offline Engine (Future)
Do not start until merchant layer and mobile app are production-ready.
Requires: OCT issuance, device key management, SQLCipher local DB,
cryptographic signing, sync endpoint, double-spend detection.

---

## Environment Variables

```bash
# Required for Next.js
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_ENCRYPTION_KEY=
INLOMAX_API_KEY=
INLOMAX_BASE_URL=
TADA_CORE_URL=              # URL of the deployed Go Core (e.g. https://core.tadapay.com)
CORE_SECRET=                # Shared secret between Next.js and Core

# Required for Go Core
SUPABASE_URL=               # Same as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=  # Same key
CORE_SECRET=                # Same as above
CORE_PORT=8080              # Port to listen on
```

---

## Deployment Checklist

- [x] TypeScript build passes (`bunx tsc --noEmit` — 0 errors)
- [x] Go build passes (`go build ./...` in services/core)
- [x] Go tests pass (`go test ./...` in services/core)
- [ ] Core deployed to production host
- [ ] `TADA_CORE_URL` set to production Core URL in Vercel
- [ ] `CORE_SECRET` set in both Vercel and Core host
- [ ] Database migrations applied to production Supabase


