# TADAPAY Core — Financial Ledger Service

**Language:** Go  
**Role:** The financial brain of TADAPAY. This service owns all money movement.  
**Principle:** Ledger is God. No system overrides ledger truth.

---

## What this service owns

- All debit/credit operations (`internal/ledger/`)
- Wallet state and balance reads (`internal/wallet/`)
- Transaction recording and idempotency (`internal/transactions/`)
- VTU provider adapters — Inlomax, future providers (`internal/providers/`)
- Eve AI routing stub — risk decisions, fraud flags (`internal/eve/`)

## What this service does NOT own

- UI rendering (Next.js owns that)
- Auth sessions (Supabase owns that)
- WhatsApp message parsing (services/whatsapp owns that)
- Cron scheduling (Vercel owns that — for now)

## How Next.js talks to this service

During the strangler fig migration, Next.js API routes that currently call
Supabase RPCs directly (`update_user_balance`, `park_data_vault`) will be
rerouted to this service's HTTP endpoints instead.

Pattern:
  Before: Next.js route → Supabase RPC
  After:  Next.js route → Core /ledger/debit → Core writes to Supabase

## Directory structure

```
core/
├── cmd/server/      ← main.go — HTTP server entry point
├── internal/
│   ├── ledger/      ← debit, credit, atomic operations
│   ├── wallet/      ← balance reads, wallet state
│   ├── transactions/← record, idempotency, status
│   ├── providers/   ← Inlomax adapter, future providers
│   └── eve/         ← AI routing, risk, fraud detection (stub)
└── pkg/
    ├── models/      ← shared types (User, Transaction, Vault, etc.)
    └── middleware/  ← auth verification, rate limiting
```

## Status

🔲 Not started — structure scaffolded, implementation pending.
