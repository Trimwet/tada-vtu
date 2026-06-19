# TADAPAY — System Design v2.0 (Master Blueprint)

**Status:** Architecture finalized | Implementation in progress  
**Version:** 2.0  
**Branch:** `v2/financial-core`  
**Last Updated:** June 2026

---

## THE ONE-LINE DEFINITION

TADAPAY is a **ledger-first financial organism** composed of a Go-based financial
core, a Next.js interface layer, and multiple human-facing channels (web, WhatsApp,
mobile), powered by an AI-driven nervous system (Eve), with Supabase as the
persistent source of truth.

---

## THE 5 CORE PRINCIPLES (NON-NEGOTIABLE)

1. **Ledger is God** — No system overrides ledger truth. All balance changes
   flow through `services/core/internal/ledger/`. Never directly.

2. **Interfaces are dumb** — WhatsApp, Web, Mobile are request layers only.
   They parse input, call Core, display output. Zero financial logic.

3. **Intelligence is centralized** — Eve (inside Core) decides which provider
   to use, whether to flag a transaction, when to retry. Nothing else decides.

4. **Offline is constrained truth** — Offline mode uses pre-approved signed
   permissions, not real money. Truth is reconciled when connectivity returns.

5. **Channels are interchangeable** — A user starting a purchase on WhatsApp
   can complete it on web. Identity and balance are channel-agnostic.

---

## ARCHITECTURE MAP

```
┌──────────────────────────────────────────────────────────────────────┐
│                        INTERFACE LAYER                               │
│                                                                      │
│   Next.js (Web)          WhatsApp Service        Mobile App (future) │
│   ─────────────          ─────────────────        ────────────────── │
│   Pages, dashboard,      Receives webhooks,       React Native /     │
│   UI components,         parses intent,           Expo (planned)     │
│   SWR data hooks         formats replies                             │
│                                                                      │
│   Rule: ZERO financial logic. Calls Core for everything that         │
│   touches money or providers.                                        │
└──────────────────────────────────────────────────────────────────────┘
                               │ HTTP
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CORE SERVICE (Go) — services/core/                │
│                                                                      │
│   cmd/server/main.go   — HTTP server, route registration             │
│                                                                      │
│   internal/ledger/     — ALL money movement (debit, credit, park)    │
│   internal/wallet/     — balance reads, wallet state                 │
│   internal/transactions/— idempotency, recording, status             │
│   internal/providers/  — Inlomax adapter, future provider adapters   │
│   internal/eve/        — routing decisions, risk, smart retry        │
│                                                                      │
│   pkg/models/          — shared types (User, Transaction, etc.)      │
│   pkg/middleware/      — auth verification, rate limiting            │
│                                                                      │
│   Rule: The ONLY place that writes to balances or calls providers.   │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER — Supabase (Postgres)                  │
│                                                                      │
│   profiles             — user accounts, balances                     │
│   transactions         — immutable transaction log                   │
│   wallet_transactions  — balance_before / balance_after per change   │
│   data_vault           — parked data records                         │
│   vault_qr_codes       — QR codes for gifting                        │
│   notifications        — in-app and push notification records        │
│   [15+ more tables]                                                  │
│                                                                      │
│   RLS: Every table locked to user_id. Core uses service role key.   │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│               EXTERNAL PROVIDERS (called by Core only)               │
│                                                                      │
│   Inlomax      — airtime, data, cable, electricity (VTU)             │
│   Flutterwave  — payment initiation, webhook verification            │
│   Resend       — transactional email                                 │
│   Web Push     — browser push notifications                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## DIRECTORY MAP

```
tada-vtu/                          ← repo root
│
├── src/                           ← Next.js interface layer (LIVE)
│   ├── app/                       ← pages and API routes
│   │   ├── api/                   ← Next.js route handlers
│   │   │   ├── v1/                ← versioned API (already exists)
│   │   │   ├── data-vault/        ← vault operations (live)
│   │   │   ├── flutterwave/       ← payment webhooks (live)
│   │   │   ├── inlomax/           ← VTU webhooks (live)
│   │   │   ├── whatsapp/          ← WhatsApp webhook receiver (live, subprocess hack)
│   │   │   └── cron/              ← scheduled background jobs (live)
│   │   ├── dashboard/             ← authenticated pages (live)
│   │   └── vault/                 ← public QR redemption (live)
│   ├── components/                ← UI components (live)
│   ├── hooks/                     ← SWR data hooks (live)
│   ├── lib/
│   │   ├── api/                   ← provider wrappers (migration target: move to Core)
│   │   │   ├── deposit-processor.ts   ← becomes Core /ledger/deposit
│   │   │   ├── provider-router.ts     ← becomes Core internal/eve routing
│   │   │   └── inlomax.ts             ← becomes Core internal/providers/inlomax.go
│   │   └── supabase/              ← Supabase client helpers (stays in Next.js)
│   └── types/                     ← TypeScript types (mirror services/core/pkg/models/)
│
├── services/                      ← NEW: backend services layer (v2)
│   ├── core/                      ← Go financial core (IN PROGRESS)
│   │   ├── cmd/server/main.go     ← HTTP server entry point
│   │   ├── internal/
│   │   │   ├── ledger/            ← debit, credit, atomic operations
│   │   │   ├── wallet/            ← balance reads, wallet state
│   │   │   ├── transactions/      ← recording, idempotency
│   │   │   ├── providers/         ← Inlomax, Flutterwave adapters
│   │   │   └── eve/               ← AI routing, risk, fraud detection
│   │   └── pkg/
│   │       ├── models/            ← shared Go types
│   │       └── middleware/        ← auth, rate limiting
│   ├── whatsapp/                  ← WhatsApp service (replaces subprocess hack)
│   └── eve/                       ← Eve standalone (if complexity demands it)
│
├── supabase/                      ← DB schema, migrations, RLS (live)
├── docs/                          ← Architecture docs (here)
│   ├── system-design-v1-current.md   ← The old Next.js-only design (reference)
│   ├── system-design-v2-tadapay.md   ← THIS FILE (master blueprint)
│   └── SYSTEM_BLUEPRINT.md            ← Data Vault feature blueprint (live)
└── vercel.json                    ← Cron schedules (live)
```

---

## MIGRATION PLAN (Strangler Fig)

The live system stays running throughout. We carve out Core piece by piece.

### Phase 1 — Core scaffold (NOW)
- [x] Create `services/core/` directory structure
- [x] Write `pkg/models/models.go` — shared types
- [x] Write `cmd/server/main.go` — server entry point with route stubs
- [ ] Initialize Go module: `go mod init github.com/Trimwet/tada-core`
- [ ] Write `internal/ledger/ledger.go` — debit/credit implementation
- [ ] Write `internal/transactions/transactions.go` — idempotency logic
- [ ] Write `/health` endpoint — used by Next.js to check Core is alive

### Phase 2 — First live endpoint
- [ ] Implement `POST /ledger/deposit` in Core
- [ ] Update `src/lib/api/deposit-processor.ts` to call Core instead of Supabase RPC
- [ ] Deploy Core alongside Next.js (Railway or Fly.io)
- [ ] Verify deposit flow works end-to-end with Core in the loop

### Phase 3 — Park and deliver through Core
- [ ] Implement `POST /ledger/park` in Core (replaces `park_data_vault` RPC)
- [ ] Update `src/app/api/data-vault/park/route.ts` to call Core
- [ ] Implement `POST /vtu/data` in Core (Eve routes to Inlomax)
- [ ] Update `src/app/api/data/route.ts` to call Core

### Phase 4 — WhatsApp upgrade
- [ ] Replace `stateful-vtu-wrapper.ts` subprocess hack
- [ ] Build `services/whatsapp/` as a proper service
- [ ] WhatsApp service calls Core HTTP API, never Supabase directly

### Phase 5 — Eve intelligence
- [ ] Build real Eve routing in `internal/eve/`
- [ ] Eve tracks Inlomax success rates in real time
- [ ] Eve implements velocity checks and fraud flags

### Phase 6 — Mobile
- [ ] React Native app calls the same Core HTTP API
- [ ] Same identity, same balance, different interface

---

## DATA FLOWS

### Money In (Flutterwave deposit)
```
User → Flutterwave → Webhook → Next.js /api/flutterwave/webhook
  → Next.js calls Core POST /ledger/deposit
  → Core: idempotency check → atomic credit → transaction record
  → Core returns { newBalance }
  → Next.js sends push notification
```

### Money Out (Buy Data)
```
User → Web/WhatsApp → Next.js /api/data (or WhatsApp service)
  → Next.js calls Core POST /vtu/data
  → Core: Eve routes to Inlomax → debit ledger → call Inlomax
  → Inlomax confirms → Core updates transaction status
  → Core returns { success, reference }
  → Interface sends confirmation
```

### Park Data Vault
```
User → Web → Next.js /api/data-vault/park
  → Next.js calls Core POST /ledger/park
  → Core: balance check → atomic debit → vault record
  → Core returns { vaultId, newBalance }
  → Next.js updates UI
```

---

## API BOUNDARY (Core HTTP Endpoints — to be built)

| Method | Path | Replaces | Status |
|--------|------|----------|--------|
| GET | /health | — | 🔲 stub |
| POST | /ledger/deposit | deposit-processor.ts + update_user_balance RPC | 🔲 |
| POST | /ledger/park | park_data_vault RPC | 🔲 |
| POST | /ledger/credit | update_user_balance RPC (credit) | 🔲 |
| POST | /ledger/debit | update_user_balance RPC (debit) | 🔲 |
| GET | /ledger/balance | profiles.balance direct read | 🔲 |
| POST | /vtu/airtime | src/lib/api/provider-router.ts purchaseAirtime | 🔲 |
| POST | /vtu/data | src/lib/api/provider-router.ts purchaseData | 🔲 |

---

## CURRENT STATE vs TARGET STATE

| Concern | Current (live) | Target (v2) |
|---------|---------------|-------------|
| Balance writes | Supabase RPC directly | Core /ledger/* |
| VTU calls | Next.js → Inlomax | Core → Eve → Inlomax |
| WhatsApp | Subprocess hack | services/whatsapp → Core |
| Provider routing | provider-router.ts (Next.js) | Core internal/eve |
| Deposit logic | deposit-processor.ts (Next.js) | Core /ledger/deposit |
| Mobile | Not started | React Native → Core |

---

## WHAT DOES NOT CHANGE

- Supabase remains the database. Core is the gatekeeper to it, not a replacement.
- Next.js remains the web interface. It becomes a thinner client over time.
- RLS policies stay. Core uses the service role key; users never bypass RLS.
- Vercel stays the deployment platform for Next.js.
- Data Vault feature logic stays the same. Only the execution path changes.

---

## DOCUMENT HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | Earlier 2026 | Initial Next.js architecture doc |
| 2.0 | June 2026 | TADAPAY v2 — Go core, services layer, Eve |
