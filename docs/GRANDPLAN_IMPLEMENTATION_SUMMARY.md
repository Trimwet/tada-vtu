# TADA VTU — Grand Plan Implementation Summary

**Last updated:** 2026-06-23  
**Scope:** Financial branch vs. main branch implementation inventory for services, mobile, Eve, and Supabase

---

## 1. Executive Summary

The repository is currently split between two architectural layers:

- **Next.js main app** (Vercel): Product UI, API routes, customer-facing dashboard, admin panel.
- **Go Financial Core** (Railway): Single-writer ledger service. Real money routes (`/ledger/debit`, `/ledger/deposit`, `/ledger/refund`) are Supabase-backed and production-ready.
- **Eve AI Agent** (Vercel): WhatsApp bot with working tools (balance check, airtime purchase, data purchase). Uses Groq LLM.
- **Supabase**: Postgres database, Row-Level Security, atomic RPC functions for debit/deposit/refund.

The architecture keeps the product experience on Next.js, routes all financial operations through the Go Core VTU handlers, and adds natural-language access via Eve.

---

## 2. What Has Been Implemented on the Financial Branch

### 2.1 Financial Core Service

A standalone Go service now exists under [services/core](../services/core) with a modular architecture.

#### Implemented modules

- [services/core/cmd/server/main.go](../services/core/cmd/server/main.go)  
  HTTP entrypoint exposing health and financial-action routes.

- [services/core/internal/accounts](../services/core/internal/accounts)  
  In-memory account creation and basic balance lookup.

- [services/core/internal/engine](../services/core/internal/engine)  
  Workflow orchestration for deposit, transfer, and refund flows.

- [services/core/internal/ledger](../services/core/internal/ledger)  
  **In-memory only for simulation**. Real ledger operations (debit, credit, transfer) go through [services/core/internal/store/supabase.go](../services/core/internal/store/supabase.go) via atomic RPCs.

- [services/core/internal/vtu](../services/core/internal/vtu)  
  **PRODUCTION ROUTES**: HTTP handlers for `/ledger/debit`, `/ledger/deposit`, `/ledger/refund`, `/wallet/{id}/balance`. Calls Supabase atomic RPCs.

- [services/core/internal/merchant](../services/core/internal/merchant)  
  Merchant registration scaffold (not yet used).

- [services/core/internal/offline](../services/core/internal/offline)  
  Offline-event creation for delayed/queued finance flows.

- [services/core/internal/providers](../services/core/internal/providers)  
  Provider abstraction and mock execution registry.

- [services/core/internal/reconciliation](../services/core/internal/reconciliation)  
  Reconciliation entry creation for completed flows.

- [services/core/internal/runs](../services/core/internal/runs)  
  Execution-run tracking and completion state.

- [services/core/internal/transactions](../services/core/internal/transactions)  
  Intent creation and lifecycle tracking.

#### Implemented financial flows

- Deposit flow
- Transfer flow
- Refund flow
- Intent lifecycle state progression
- Run lifecycle state progression
- Ledger balance updates
- Reconciliation entry creation

#### Exposed API surface

**Production routes (Supabase-backed, real money):**
- `GET /health` — service status
- `POST /ledger/deposit` — credit wallet (idempotent, atomic)
- `POST /ledger/debit` — debit wallet (idempotent, atomic, no overdraft)
- `POST /ledger/refund` — refund failed transaction (idempotent, atomic)
- `GET /wallet/{userId}/balance` — read current balance

**Simulation routes (in-memory, do NOT use for real money):**
- `POST /sim/transfers`, `/sim/refunds`, `/sim/intents` — scaffolding only, wiped on restart

#### Verification status

The Go service is currently verified by tests. The latest verification run passed with:

- accounts
- engine
- ledger
- merchant
- offline
- providers
- reconciliation
- runs
- transactions

### 2.2 Current Maturity of the Financial Core

This is an early but working implementation focused on the operating model rather than full production readiness.

It currently includes:

- an intent-driven execution model
- a separate orchestration layer
- ledger-side state updates
- run tracking
- reconciliation scaffolding

It does not yet include:

- real persistence
- production-grade auth
- real provider integrations
- full audit and compliance controls
- production deployment packaging

---

## 3. What Exists on the Main Branch

### 3.1 Services Layer

The current main branch does not carry a tracked services implementation matching the financial-core structure. In other words, the dedicated Go financial engine is not part of the main branch as a shipped product layer.

What the current workspace does contain locally is the financial-branch implementation under [services/core](../services/core).

### 3.2 Mobile Layer

A mobile app shell exists locally under [mobile](../mobile) and is wired to shared constants from the workspace package layer.

Current state:

- [mobile/App.tsx](../mobile/App.tsx) renders a starter money-operating-system UI
- it uses shared constants from the workspace shared package
- it currently shows a placeholder wallet balance and a static list of networks/services

This is a frontend shell and not yet a fully integrated mobile financial workflow.

### 3.3 Eve Layer

An agent entrypoint exists under [eve-agent](../eve-agent), with a minimal agent definition in [eve-agent/agent/agent.ts](../eve-agent/agent/agent.ts).

Current state:

- basic agent bootstrap
- no full business workflow wired in yet

### 3.4 Supabase Layer

The main branch has a substantial Supabase foundation under [supabase](../supabase).

#### Database schema and data model

The schema in [supabase/schema.sql](../supabase/schema.sql) includes:

- profiles
- transactions
- wallet transactions
- beneficiaries
- notifications
- reseller API keys

#### Security and access control

The schema includes:

- Row Level Security (RLS) setup
- policies for user-owned data
- service-role access for reseller API keys
- trigger-based profile creation on signup

#### Wallet and balance logic

The schema includes SQL functions for:

- updating user balances
- enforcing debit safeguards
- recording wallet transactions

#### Migrations and platform features

The main branch also contains migrations for:

- withdrawals
- push notifications
- analytics tables
- data vault features
- vault QR and refund improvements
- performance settings
- pricing tiers
- user preference updates
- reseller-related features

#### Main-branch Supabase role in the plan

Supabase is the existing persistence and access-control layer for the product platform. It is the natural place for:

- user profiles
- transaction records
- wallet and ledger references
- notification and beneficiary storage
- policy-based access control

---

## 4. What the Main Branch Product Layer Already Represents

The main branch is already a strong product foundation for VTU operations, including:

- airtime and data purchase flows
- wallet-related features
- payment integration concepts
- data vault and QR-based gifting flows
- admin and analytics surfaces
- cron and scheduled-task scaffolding
- webhook handling concepts

This means the main branch is the user-facing experience layer, while the financial branch is the transactional engine layer.

---

## 5. How the Pieces Fit Together in the Grand Plan

### Product layer

- Next.js application remains the customer-facing experience
- mobile app becomes a client experience on top of the same core services
- Eve agent becomes an interaction layer for conversational workflows

### Financial core layer

- the Go service becomes the canonical engine for money movement
- deposits, transfers, refunds, and related effects are orchestrated centrally here
- this layer owns the transaction lifecycle and ledger consequences

### Data and control layer

- Supabase remains the shared persistence and authorization layer
- the core service can reference or feed Supabase-backed state as the platform matures

---

## 6. Practical Interpretation of the Current State

At the moment, the implementation is best understood as:

- a working financial-core prototype on the financial branch
- a mature product platform foundation on the main branch
- a mobile and agent shell that still need deeper integration

The next step is not to rebuild everything from scratch, but to connect these layers so the financial core becomes the authoritative engine for the existing VTU experience.

---

## 7. Recommended Mental Model

Think of the system like this:

- Main branch = product surface and user experience
- Financial branch = transaction operating system
- Supabase = shared persistence and security
- Mobile and Eve = client interfaces to the same core capability

That is the architectural direction the current implementation is pointing toward.
