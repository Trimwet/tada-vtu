# Deposit & Withdrawal Flow Hardening — 2026-06-30

## Context

Four critical security/financial vulnerabilities were identified in the deposit and withdrawal pipeline. All fixes were developed and applied in a single session.

## Critical Bugs Fixed

| Bug | File | What Changed |
|-----|------|-------------|
| Ghost route `/api/withdrawal/initiate` took userId from body, no session check | `src/app/api/withdrawal/initiate/route.ts` | **Deleted** |
| `net_amount` stored gross amount, not amount minus fee | `src/app/api/withdrawal/transfer/route.ts` | Both insert (line 187) and coreDebit metadata (line 217) now use `withdrawalAmount - transferFee`; success response includes `netAmount` |
| Modal banks never loaded (checked `data.banks`, API returns `data.data`) | `src/components/withdrawal-modal.tsx` | Changed to read `data.data` |
| Modal fee hardcoded at ₦36/₦52, didn't match backend | `src/components/withdrawal-modal.tsx` | Dynamic fetch via `/api/flutterwave/fee-check` (POST); fallback aligns with backend 3-tier brackets |
| Modal MIN=500/MAX=50,000 didn't match route | `src/components/withdrawal-modal.tsx` | Updated to MIN=100/MAX=500,000; QUICK_AMOUNTS extended to ₦100,000 |
| Refund failures had no retry mechanism — money stuck | `webhook/route.ts`, `transfer/route.ts`, migration 044 | New `failed_refunds` table; both catch blocks enqueue failures; `retry-failed-refunds` cron retries daily, escalates after 5 attempts |
| `flutterwaveRequest` had no timeout — could hang | `src/lib/api/flutterwave-transfer.ts` | Added `AbortSignal.timeout(8000)` |
| `atomic_refund` NOT NULL crash on balance tracking | `supabase/migrations/040_fix_atomic_refund_balance_tracking.sql` | Fixed balance_before/balance_after columns |

## Implementation Plan Corrections

| ID | Severity | Finding | Resolution |
|----|----------|---------|------------|
| C1 | 🔴 | `net_amount` not applied in live code | Fixed in route file |
| C2 | 🔴 | Modal fee/limits not applied | Fixed in modal |
| C3 | 🔴 | Banks endpoint shape mismatch | Fixed in modal |
| C4 | 🔴 | No refund retry mechanism | Added migration 044 + retry cron |
| C5 | 🟠 | Plan code used `reference` not `externalReference` | Live code was correct; plan corrected |
| C6 | 🟠 | Modal fee fallback had 2 tiers vs route's 3 | Fixed in modal |
| C7 | 🟠 | Plan said "create" migration 043 but it existed | Plan corrected to "verify" |
| C8 | 🟠 | Cron count mis-assessed | All 7 crons consolidated to 1 dispatcher for Hobby plan |
| C12 | 🟡 | No fetch timeout | Fixed in flutterwave-transfer.ts |

## Files Changed

```
modified:   src/app/api/withdrawal/transfer/route.ts          (net_amount, netAmount response, refund enqueue)
modified:   src/components/withdrawal-modal.tsx               (dynamic fee, banks fix, limits, quick amounts)
modified:   src/app/api/flutterwave/webhook/route.ts           (failed_refunds enqueue)
modified:   src/lib/api/flutterwave-transfer.ts                (timeout on requests)
modified:   src/lib/api/deposit-processor.ts                   (hold before credit, C4 fix — already applied)
modified:   vercel.json                                        (single cron dispatcher entry)
deleted:    src/app/api/withdrawal/initiate/route.ts           (ghost route)
new:        supabase/migrations/044_failed_refund_queue.sql    (failed refunds table)
new:        src/app/api/cron/dispatcher/route.ts               (master cron dispatcher)
new:        src/app/api/cron/retry-failed-refunds/route.ts     (refund retry handler)
new:        src/app/api/cron/release-deposit-holds/route.ts    (hold release — pre-existing, newly tracked)
new:        current-feature/                                   (objective, plan, corrections documentation)
```

## Still Pending (manual)

1. Run `supabase db push` to apply migration 044
2. Set `SELF_URL` env var in Vercel to `https://www.tadavtu.com`
3. Verify dispatcher post-deploy

## Build Status

`tsc --noEmit` — zero errors.
