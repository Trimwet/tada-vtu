# Production Financial Core Hardening Plan

**Status:** Post-prototype hardening plan for the financial operating system  
**Target:** Move from a working financial core prototype to a production-grade transaction operating system

---

## 1. Current Reality

The current implementation is no longer just an idea-stage architecture. It is a working financial operating system prototype with:

- an intent-driven financial core in Go
- a ledger engine with the right direction of travel
- transaction lifecycle handling
- provider abstraction
- reconciliation scaffolding
- run tracking
- offline-event capture

This puts the system in the range of a pre-production financial engine rather than a simple MVP.

---

## 2. What Is Already Strong

### 2.1 Intent-to-execution separation
The biggest architectural win is the separation of:

- intent: what the user wants
- run: how the system executes it
- ledger effect: what actually happened

This is the correct mental model for a financial system.

### 2.2 Reconciliation is present early
The presence of reconciliation, run tracking, and provider response handling means the system is already designed with failure recovery in mind.

### 2.3 Provider layer is isolated correctly
Business logic is separated from external providers, which is essential for maintainability and resilience.

---

## 3. What Is Still Not Production-Safe

### 3.1 Ledger is not yet ledger-grade
The current ledger is still simplified and in-memory oriented. It is missing the deeper correctness properties required for real money handling.

Needed improvements:

- strict double-entry enforcement
- immutable append-only ledger records
- balance derivation from ledger history instead of a mutable balance field
- reconstruction and auditability

### 3.2 No durable event log as system of record
The current model has intents, runs, and reconciliation, but it does not yet have a true event stream that acts as the authoritative history of financial state.

### 3.3 Dual truth risk remains
The product layer still relies on Supabase-backed balances and transaction records while the Go core also manages ledger state. That creates the risk of two sources of truth.

### 3.4 Transaction atomicity boundaries are not yet explicit
The system needs a single, clearly defined rule for atomicity:

- the ledger commit and run completion must be treated as one atomic decision

---

## 4. Target Architecture

### 4.1 Core truth
The Go financial core should become the single source of financial truth.

### 4.2 Product layer boundary
Supabase should remain responsible for:

- identity
- product data
- UI state
- non-financial records
- projections and caches

It should not be the authority for money state.

### 4.3 Desired system model

```text
Users
  ↓
Web / Mobile / WhatsApp / Admin
  ↓
Eve layer
  ↓
Financial core (Go)
  ↓
Event store + ledger engine
  ↓
Providers + bank rails
```

---

## 5. The Business Identity of the System

The system should be treated as:

- not just a VTU app
- not just a wallet app
- not just a payments API

It should be treated as:

- a transaction operating system for money movement

That is the correct framing for the architecture.

---

## 6. Next Implementation Priorities

### Priority 1 — Make the ledger the only source of truth
Replace the current balance-centric model with a ledger-authoritative model.

#### Goals

- remove balance as the primary truth source
- derive balances from ledger history
- ensure every credit and debit is traceable

#### Implementation steps

1. Introduce immutable ledger entries
2. Record every effect as a signed ledger event
3. Derive current balances from ledger history
4. Keep Supabase as a projection layer only

### Priority 2 — Introduce an event store
Every financial action should emit a durable event stream.

#### Example event types

- intent_created
- run_started
- provider_called
- debit_posted
- credit_posted
- reconciled
- failed
- reverted

#### Benefits

- replayability
- debugging
- auditability
- crash recovery

### Priority 3 — Make runs deterministic and replayable
A run should be designed so that:

- the same input yields the same ledger outcome
- replaying the run is possible
- state transitions are explicit and testable

### Priority 4 — Define atomic transaction boundaries
A single transaction should only be considered complete when:

- the ledger effect is committed
- the run state is finalized
- the reconciliation state is recorded

If any step fails, the system should preserve a safe and recoverable state.

---

## 7. Recommended Hardening Architecture

### 7.1 Core components

- Intent service
- Run service
- Ledger service
- Event store
- Provider adapter layer
- Reconciliation service
- Idempotency layer
- Audit log service

### 7.2 Data model direction

The system should eventually model:

- accounts
- ledger entries
- intents
- runs
- event records
- reconciliation records
- provider responses

### 7.3 Control-flow direction

```text
Intent created
  ↓
Run created
  ↓
Provider execution requested
  ↓
Ledger effect committed
  ↓
Reconciliation recorded
  ↓
Run finalized
```

---

## 8. What Should Be Reworked First

### 8.1 Ledger correctness
This is the first hardening target.

### 8.2 Source-of-truth cleanup
The system must stop mixing financial truth across two systems.

### 8.3 Event log and replayability
This should become part of the core architecture, not an optional extension.

### 8.4 Idempotency and retries
Every provider and ledger effect should be safe to retry without double-posting funds.

---

## 9. CTO-Style Verdict

The current system is strong enough to be treated as a serious financial operating system prototype.

The remaining work is not about adding more features. It is about hardening the system so it can safely process real money.

The critical gaps are:

- ledger correctness
- event-sourced execution history
- single source of truth enforcement
- atomicity guarantees

Once these are addressed, the platform moves from prototype to production-grade financial infrastructure.

---

## 10. Suggested Next Step

The next step should be a focused implementation pass that builds:

1. a durable event store
2. a ledger-authoritative state model
3. atomic execution boundaries
4. a clean Supabase-to-core separation

That is the bridge from:

- working financial core

to

- production-safe financial operating system

---

## 11. Implementation Roadmap

The next work should be executed in phases rather than as one giant rewrite.

### Phase 0 — Stabilize the current model

**Goal:** lock in the current behavior before hardening it.

**Tasks**

- define canonical intent, run, and ledger states
- document allowed transitions and failure states
- add regression tests for deposit, transfer, and refund flows
- freeze the API contract for the core service

**Acceptance criteria**

- all core flows are test-covered
- state transitions are explicit and predictable
- no ambiguous execution paths remain

### Phase 1 — Make the ledger authoritative

**Goal:** turn the ledger into the system of record.

**Tasks**

- introduce immutable ledger entries for every debit and credit
- derive balances from ledger history rather than mutable account balance fields
- add a balance projection service for fast reads
- move account balance logic under the ledger service ownership

**Repository targets**

- [services/core/internal/ledger](../services/core/internal/ledger)
- [services/core/internal/accounts](../services/core/internal/accounts)

**Acceptance criteria**

- every money movement creates an immutable ledger record
- current balances can be reconstructed from ledger history
- the ledger can be audited without relying on in-memory state

### Phase 2 — Add an event store and replay layer

**Goal:** make financial history durable and replayable.

**Tasks**

- create a dedicated event store package under the core service
- emit events for intent creation, run start, execution outcome, ledger posting, reconciliation, and failure
- store event sequence numbers for replay ordering
- build a replay service that reconstructs the ledger state from events

**Suggested package structure**

- [services/core/internal/events](../services/core/internal/events)
- [services/core/internal/reconciliation](../services/core/internal/reconciliation)

**Acceptance criteria**

- every financial action produces a durable event stream
- replaying the event log reconstructs the same ledger outcome
- debugging a failed run is possible from the event trail

### Phase 3 — Enforce atomic execution and idempotency

**Goal:** make the system safe under retries and partial failures.

**Tasks**

- add idempotency keys for provider calls and ledger commits
- define a single atomic boundary for run completion and ledger posting
- introduce safe retry logic that prevents duplicate money movement
- add compensation or reversal paths for failed runs

**Repository targets**

- [services/core/internal/providers](../services/core/internal/providers)
- [services/core/internal/runs](../services/core/internal/runs)
- [services/core/internal/transactions](../services/core/internal/transactions)

**Acceptance criteria**

- retries do not double-post funds
- the system can recover safely after a crash or timeout
- a run has a definitive success, failure, or reverted state

### Phase 4 — Separate Supabase from financial truth

**Goal:** eliminate dual-source-of-truth risk.

**Tasks**

- keep Supabase for identity, product data, and UI projections
- make the Go core the authority for ledger state
- treat Supabase tables as read models or projections rather than financial truth
- add a synchronization path for non-financial records only

**Acceptance criteria**

- money state is derived from the core ledger and not from Supabase balance fields
- the product layer can read financial projections without owning financial correctness
- the boundary between product data and money state is explicit

---

## 12. Concrete Implementation Checklist

### Foundation

- [ ] define the canonical state machine for intents
- [ ] define the canonical state machine for runs
- [ ] define the canonical state machine for ledger entries
- [ ] add regression tests for all current flows

### Ledger hardening

- [ ] introduce immutable ledger entries
- [ ] add ledger sequence numbers
- [ ] derive balance from ledger history
- [ ] remove balance dependence from the hot path

### Event and replay

- [ ] create an event store package
- [ ] emit events for each financial transition
- [ ] add replay and reconstruction support
- [ ] support event-based debugging and audit queries

### Safety and atomicity

- [ ] add idempotency support
- [ ] define atomic commit rules
- [ ] add retry and compensation handling
- [ ] produce reconciliation records only after successful ledger effect

### Platform integration

- [ ] keep Supabase as projection layer
- [ ] expose core endpoints to web, mobile, and Eve
- [ ] add monitoring for failed or stuck runs
- [ ] add alerting for ledger anomalies

---

## 13. Definition of Done

The financial core is production-ready when:

- ledger state is authoritative and reconstructable
- all financial actions are event-sourced
- retries are safe and idempotent
- the system has a single source of truth for money
- failures are recoverable without corrupting balance state
- the product layer depends on the core for financial execution

That is the bridge from:

- working financial core

to

- production-safe financial operating system
