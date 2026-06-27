# TADAPAY — Project Status

**Last Updated:** June 26, 2026  
**Architecture:** Ledger-first, multi-service (Next.js web, Go Financial Core, Eve agent, React Native mobile, shared packages)  
**Current Phase:** MVP — Internal ledger + VTU operations (no blockchain at this stage)

---

## System Map

```
tada-vtu/
├── src/                  Next.js 15 — web app + API routes (deployed on Vercel)
├── services/core/        Go Financial Core — the money truth layer
├── eve-agent/            Eve AI agent — natural language interface (WORKING - Groq LLM)
├── mobile/               React Native (Expo) — mobile app (scaffolding)
├── packages/shared/      Shared constants and types
└── supabase/migrations/  36 database migrations
```

---

## Reality Check: What Works vs What's Still Scaffolding

### ✅ Next.js Web App (src/) — Production-Ready Routes
All VTU purchases, wallet funding, withdrawals, and UI are **wired and tested** to the Go Core for money operations.

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

### ✅ Go Financial Core — VTU Ledger Layer (services/core/internal/vtu/)
**Real, Supabase-backed. This is the ONLY path that moves real money.**

The `/ledger/*` endpoints are production-use paths. The `/sim/*` endpoints are explicitly simulation-only and do NOT touch the database.

| Endpoint | What it does |
|---|---|
| `POST /ledger/deposit` | Credits user wallet (idempotent, atomic via Supabase RPC) |
| `POST /ledger/debit` | Debits wallet before provider call, enforces no-overdraft |
| `POST /ledger/refund` | Credits back on provider failure, marks original tx failed |
| `GET /wallet/{id}/balance` | Reads live balance from Supabase |
| `GET /health` | Service health check |

All protected by `CORE_SECRET` shared-key auth.

### ✅ Eve AI Agent (eve-agent/)
**Fully wired and operational.** All tools call the Core VTU endpoints with proper authentication and approval gates.

| Tool | Function | Calls | Status |
|---|---|---|---|
| `check_balance` | Get wallet balance | `/api/wallet/balance` | ✅ Working |
| `buy_airtime` | Purchase airtime (MTN, Airtel, Glo, 9mobile) | `/api/airtime/buy` | ✅ Working |
| `buy_data` | Purchase data bundles | `/api/data/buy` | ✅ Working |
| `get_data_plans` | Fetch live data plans per network | `/api/data-plans` | ✅ Working |
| `get_transaction_history` | View recent transactions | `/api/transaction` | ✅ Working |

**Integration:** WhatsApp message → Baileys bridge → Eve (Groq LLM) → tool execution → Core API → Supabase.

**Security:** All tools authenticated via `x-core-secret` header (Bearer token). Purchase tools have approval gates requiring user confirmation before execution.

### ✅ Supabase Schema (supabase/migrations/)
32 migrations applied. Key tables: `profiles`, `transactions`, `wallet_transactions`,
`beneficiaries`, `notifications`, `gift_cards`, `data_vault`, `scheduled_purchases`,
`achievements`, `user_achievements`, `user_sessions`, `user_plan_preferences`.

Atomic balance operations go through the `update_user_balance` RPC.

---

## ⚠️ What Is NOT Production-Ready

### ❌ Eve Agent (eve-agent/)
- Framework is installed but tools are wired only to demo/test endpoints.
- Agent cannot yet check real balances or execute real purchases.
- Next: Wire tools to `/api/eve/airtime`, `/api/eve/data`, and `/api/wallet/balance` endpoints.

### ⚠️ Mobile App (mobile/)
- Expo scaffold with static screens.
- Currently not connected to Core or Supabase auth flow.
- Designed for future D2D transfers and offline support.
- MVP is WhatsApp + Web; mobile is Phase 2.
- Next: Auth + balance display + airtime flow integration.

### ⚠️ Go Core Abstract Engine (services/core/internal/engine/, ledger/, runs/, reconciliation/)
- All in-memory, not persisted.
- `/sim/*` endpoints are for simulation only — they do NOT move money.
- Real money ONLY flows through `/ledger/*` endpoints.
- The abstract engine is scaffolding for future double-entry ledger (Phase 3+).
- CRITICAL: Do not call `/sim/*` from production code.

### ⚠️ Offline Service (services/core/internal/offline/)
- Stub implementation (register device, track offline events).
- Full offline D2D design (signed cheques, device key mgmt, sync) is Phase 2+.
- Not required for MVP WhatsApp + Web system.

### ⚠️ Merchant Service (services/core/internal/merchant/)
- In-memory stubs only.
- TadaTag identity system for merchant payouts planned for Phase 2.
- Current MVP uses direct user wallets (no merchant tier).

---

## Architecture: Internal Ledger Only (MVP)

The Core runs **one production system** (Supabase-backed `/ledger/*` routes) and one **simulation system** (in-memory `/sim/*` routes):

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

### 1. Deploy Go Core to Production (Blocking real transactions)
Core currently only runs on `localhost:8080`. To process real money, deploy to a persistent host.
Recommended: Railway ($5–10/mo, native Go support) or Render.

**Required env vars:**
```
SUPABASE_URL=https://kuacpgsfwlxdvmbhbcet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
CORE_SECRET=[generate-strong-random-secret]
CORE_PORT=8080
```

Once deployed, set `TADA_CORE_URL` in Vercel to point to the deployed Core.

### 2. Deploy Eve Agent to Vercel (Already wired, just needs hosting)
Eve agent is fully functional with all 5 tools wired. Just needs deployment.

**Required env vars:**
```
GROQ_API_KEY=[your-groq-api-key]
CORE_SECRET=[same-as-core]
NEXT_APP_URL=[your-next-js-url]
```

### 3. Mobile App Auth + Wallet Screen (High-value, Phase 2)
Scaffold exists but not connected to backend. Implement:
- Supabase auth flow
- Balance display from Core
- Airtime/data purchase flow
- This opens a third channel for users (Web + Mobile + WhatsApp).

### 4. Merchant Payout System (After MVP)
Current system is user-to-user only. For merchant airtime sellers:
- Merchant account creation / KYC
- Payout settlement to bank account
- TadaTag identity layer
- Merchant dashboard

### 5. Offline Engine & D2D Transfers (Future, post-MVP)
Once mobile is solid, add offline capability:
- Device key management (Shamir Secret Sharing)
- Offline Capability Tokens (OCT)
- Signed cheques + local ledger
- BLE/WiFi Direct discovery + data transfer
- Sync + double-spend detection

---

## Environment Variables

```bash
# Required for Next.js (Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://kuacpgsfwlxdvmbhbcet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
FLUTTERWAVE_SECRET_KEY=[your-secret]
FLUTTERWAVE_PUBLIC_KEY=[your-public]
FLUTTERWAVE_ENCRYPTION_KEY=[your-encryption]
INLOMAX_API_KEY=[your-inlomax-key]
INLOMAX_BASE_URL=https://api.inlomax.com
TADA_CORE_URL=https://[your-deployed-core-url]  # e.g., https://core.tadapay.com
CORE_SECRET=[generate-strong-random-secret]
CRON_SECRET=[another-strong-random-secret]

# Required for Go Core (Railway/Render)
SUPABASE_URL=https://kuacpgsfwlxdvmbhbcet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[same-as-above]
CORE_SECRET=[same-as-vercel]
CORE_PORT=8080

# Required for Eve Agent (Vercel)
GROQ_API_KEY=[your-groq-api-key]  # Free tier available at console.groq.com
CORE_SECRET=[same-as-vercel]
NEXT_APP_URL=https://[your-next-js-url]  # e.g., https://tadapay.com
```

---

## Deployment Checklist

**Local & Build:**
- [x] TypeScript build passes (`bunx tsc --noEmit` — 0 errors)
- [x] Go build passes (`go build ./...` in services/core)
- [x] Go tests pass (`go test ./...` in services/core)

**Production Deployment:**
- [ ] Go Core deployed to production (Railway/Render)
- [ ] Core health check passes: `curl https://[core-url]/health`
- [ ] `TADA_CORE_URL` set to production Core URL in Vercel
- [ ] `CORE_SECRET` set in both Vercel and Core environment
- [ ] `GROQ_API_KEY` set in Vercel for Eve agent
- [ ] Database migrations applied to production Supabase
- [ ] Eve agent deployed to Vercel (or as standalone service)
- [ ] WhatsApp webhook configured in Meta Business Manager
- [ ] Test end-to-end: WhatsApp message → Eve → Core → Supabase → reply
- [ ] All financial endpoints tested with real test transactions
- [ ] Monitoring & logging configured (Sentry, DataDog, or similar)


