# TADAPAY — Implementation Plan (Branch: tadapay/initial)

## Overview
This document describes the implementation plan to add TADAPAY to the existing TADA VTU workspace, using Eve (Vercel), React/Expo, TypeScript, Go for the ledger core, and Bun/Elysia for service-side components where appropriate. It focuses on an incremental, auditable approach: ship a ledger-first MVP (internal balances + TadaTag) and phase in on-chain settlement and non-custodial features.

---

## Quick Git & Dev commands
- Create the branch locally and push:

```bash
# from repo root
git checkout -b tadapay/initial
git push -u origin tadapay/initial
```

- Start local dev servers (recommended terminals):

```bash
# Terminal 1 — Next.js (app)
cd tada-vtu
bun run dev

# Terminal 2 — Eve agent
cd tada-vtu/eve-agent
bun run dev

# Terminal 3 — Mobile (optional)
cd tada-vtu/mobile
npx expo start
```

---

**File created:** [tada-vtu/TADAPAY-implementation-plan.md](tada-vtu/TADAPAY-implementation-plan.md)

## Goals (MVP)
- **Ledger-first, no blockchain**: Internal balance system backed by Supabase only. Users interact via internal ledger + TadaTag identity. No on-chain settlement for MVP.
- **Eve agent working**: WhatsApp natural-language interface with real tools (check balance, buy airtime, buy data). Already functioning.
- **Offline ready**: D2D signed-cheque flow scaffolding (BLE discovery + WiFi Direct tunnel) and local append-only ledger on device (SQLite).
- **Security**: Single-live-device spend credential, Emoji password (6-emoji login, 3-emoji confirmation), Argon2 hashing, hardware keystore integration.
- **Mobile**: React Native/Expo scaffold connected to auth and wallet balance.

## Tech Stack
- Frontend Mobile: Expo (React Native), TypeScript, react-native-ble-plx, react-native-wifi-p2p / MultipeerConnectivity (iOS), react-native-nfc-manager, expo-sqlite, expo-crypto.
- Web Frontend: Next.js (app router), TypeScript, React.
- Agent: Vercel Eve (agent/), Groq (or fallback model) via Eve — keep model configurable; disable unnecessary harness tools for Groq stability.
- Backend: Supabase (Postgres + Auth + RLS) + Bun/Elysia microservices for high-throughput APIs.
- Ledger Core: Go service (single-writer pattern) for monetary writes or Bun/Elysia worker depending on engineering preference — recommended: Go for the single-writer ledger core.
- Key management: Device hardware keystore (react-native-keychain), Shamir Secret Sharing for recovery (2-of-3), backend holds an encrypted share.
- On-chain settlement (phase 3+): Only after MVP proves ledger model — not in Phase 1 scope.
- CI/CD & Hosting: Vercel for web + Eve deployments; Railway for Go Core service; GitHub Actions for CI.

## High-level Architecture
- Client App (mobile): UI, local ledger (append-only SQLite), hardware signing, emoji password, D2D transfer stack.
- Backend API Gateway: Auth, sync & validation engine, spending credential issuance, replay protection, float management, dispute UI.
- Ledger Core (single-writer): Journal entries, reservations, reconciliation against treasury bank.
- Eve Agent: Natural language entry points, limited tool access, routes to Next.js APIs for operations that affect money. **Currently working with Groq.**
- Optional On-chain Layer (post-MVP research): Not required for MVP. If future on-chain settlement is needed, separate architectural review required.

## Implementation Plan (detailed)
**Phase 0 — Branching & Audit (1–2 days)**
- Create branch `tadapay/initial`.
- Audit current repo for integration points:
  - [tada-vtu/eve-agent](tada-vtu/eve-agent)
  - API routes under [tada-vtu/src/app/api or src/pages/api] (search `wallet`, `transaction`, `airtime`)
  - Mobile code under [tada-vtu/mobile]
- Create this plan file under [tada-vtu/TADAPAY-implementation-plan.md].

**Phase 1 — Core Ledger + Agent Hooks (3–6 weeks)**
1. Supabase schema updates (atomic migrations):
   - tables: journal_entries, accounts (account_id, user_id, type), spending_credentials, devices, device_shares, disputes, withdrawals, replay_registry.
   - enforce canonical locking (acquire locks using SELECT FOR UPDATE ordering by account_id to prevent deadlocks).
2. Implement Go Financial Core (single-writer):
   - API: `/ledger/write` authenticated with service key. All monetary state updates append-only via journal entries.
   - Reconciliation: periodic compare of treasury external balance vs ledger treasury account.
3. Wallet API adapters (Next.js / Bun):
   - `/api/wallet/balance`, `/api/sync/pending`, `/api/withdraw`, `/api/deposit/confirm`
   - Core secret access from Eve agent for agent-initiated calls.
4. Eve agent: minimal tools only — `check_balance`, `get_transaction_history`, `get_data_plans`, `buy_airtime`, `buy_data` (each routes to Next.js API endpoints). Disable all extraneous harness tools; test with Groq model in code-mode if needed.

**Phase 2 — Mobile D2D + Local Ledger (4–8 weeks)**
1. Local ledger schema (SQLite): TX records with id, prev_hash, record_hash, nonce, timestamp, sender, receiver, amount, status, signature, settled_hash.
2. Implement signing via hardware keystore and Argon2 + emoji flow for authentication; store encrypted local hash in secure store.
3. D2D discovery: BLE for discovery; WiFi Direct for data transfer (iOS use Multipeer/NFC fallback). Implement handshake to exchange signed-cheque records and local ledger updates.
4. Sync flow: Queue manager sends pending TXs to `/api/sync/pending` with signed chains; backend validates chain, signature, nonce ranges, and spending credential.
5. Single-live-device spending credential logic: backend issues time-limited, nonce-ranged credential assigned to a device_id. Enforce only one active credential per account in DB.

**Phase 3 — Recovery, Security & Ops (2–4 weeks)**
1. Implement Shamir 2-of-3 shares for recovery: device share (keystore-protected), backend share (encrypted with user emoji-hash), and user backup QR.
2. Implement device registration, revocation, and handover flows (backend-mediated re-split during device change).
3. Implement emoji entropy checks, blacklist, position-randomized grid UI, offline local verification and lockout policy.
4. Build dispute dashboard for Support (web UI) to view chain evidence, authorize manual reversals.

**Phase 4 — Future Enhancements (post-MVP)**
- Fiat on/off ramp via Paystack/Flutterwave (regulatory review required).
- On-chain settlement architecture review (if needed at scale).
- Advanced D2D features (NFC tap, batch transfers).

## Things to know before starting
- Eve agent: keep the agent as an orchestration layer only — never let it hold keys or sign money flows; agent must call secure server endpoints only.
- Groq model: disable unused Eve harness tools and test in code-mode if function calling fails. Keep model configurable in env.
- Supabase service keys: store in eve-agent/.env and Next.js .env; never commit secrets.
- iOS D2D constraints: iOS background discovery is limited; plan Android-first for D2D and use NFC/tap-to-pay for iOS.
- Gas bootstrap: plan fee-delegation or sponsor first x txs using treasury in Phase 1.

## Risks & Mitigations
- Double-spend across devices: Mitigate with single-live-device spending credential + backend-issued nonce ranges.
- Privacy leakage (on-chain public balances): Use internal ledger + TadaTag for MVP; per-transaction HD-derived addresses if you need on-chain UX.
- Regulatory (CBN): Phase 1 P2P on-ramp avoids direct fiat-crypto bridge; consult counsel before Paystack/bank gateway rollout.
- Groq function-calling instability: Disable unnecessary harness tools, use codeMode; fallback to Anthropic/Gateway if budget allows.
- Float exhaustion during runs: add platform circuit-breaker and per-user daily withdrawal limits.

## Competitors & Differentiators
- Competitors: Chipper Cash, Flutterwave, OPay, PalmPay — all have strong fiat rails.
- Differentiators: Native offline D2D signed-cheque UX, emoji-first memorable security, WhatsApp Eve agent integration for natural-language payments, TADA distribution/integration.

## System Blueprint & Data Flows (abridged)
- Offline send (D2D): Sender creates signed TX → sends to receiver via WiFi-Direct → receiver updates local ledger (Pending Incoming) → whichever party comes online first sends to backend → backend validates chain/credential → writes ledger journal via Go core → marks settled.
- Withdrawal: User requests withdraw → Next.js reserves amount via ledger core → backend processes payout using treasury float (manual ops or Paystack) → journal entries complete.

## Example API & Agent Hygiene
- Agent tools MUST call Next.js APIs; Next.js must authenticate agent calls using `x-core-secret` header.
- Never embed raw private keys or raw emoji sequences in logs. Store only Argon2 hashes + salts and encrypted shares.

## Minimal Deliverables for Sprint 1
- Branch `tadapay/initial` created and pushed
- Supabase migration file creating journal_entries, accounts, spending_credentials
- Go ledger core scaffolding (HTTP endpoint + basic append-only write)
- Next.js API `wallet/balance` and `sync/pending`
- Eve agent with three safe tools wired to those APIs
- Markdown docs and run commands (this file)

---

If you want I can now:
- Run a repo audit and list all candidate files to change (APIs, mobile files, Eve files), or
- Open a pull request template and populate the branch checklist,
- Or start implementing the Supabase schema migration.

Which one should I do next?