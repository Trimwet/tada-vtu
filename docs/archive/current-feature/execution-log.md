# Execution Log: Deposit & Withdrawal Flow Hardening

**Executor:** OpenCode  
**Date:** 2026-06-30  
**Status:** ✅ Complete

---

## Deviations from Original Plan

Per corrections.md findings, these changes were applied beyond the plan:

| ID | Deviation | Reason |
|----|-----------|--------|
| C4 | Hold inserted **before** `coreDeposit()` instead of after | Closes race window where deposit was credited before hold existed |
| C4 | Used `externalReference` (stable payment ref) as `deposit_holds.transaction_reference` instead of internal reference | Prevents duplicate holds on webhook retries; idempotent |
| C4 | Added hold cleanup on `coreDeposit()` failure | Prevents orphan holds for failed deposits |
| C9 | `getTransferFee()` moved **before** PIN verification | Avoids wasted bcrypt work if Flutterwave fee API is slow/down |
| C9 | Added try-catch around `getTransferFee()` with fallback defaults | Prevents Flutterwave fee API failure from blocking withdrawals |
| C1-C3 | `withdrawal-modal.tsx` updated to call `/api/withdrawal/transfer` with correct payload and response handling | Prevents frontend from breaking when initiate route is deleted |
| C7 | Removed initiate route from `CODEBASE_MAP.md` docs | Documentation accuracy |

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/043_deposit_hold_period.sql` | **Created** — deposit_holds table + RPCs |
| `src/app/api/withdrawal/initiate/route.ts` | **Deleted** — ghost route removed |
| `src/app/api/withdrawal/transfer/route.ts` | **Rewritten** — bcrypt PIN, holds check, daily limits, payout balance check, rate limiting |
| `src/app/api/cron/release-deposit-holds/route.ts` | **Created** — cron endpoint to release expired holds |
| `src/lib/api/deposit-processor.ts` | **Updated** — hold insert before coreDeposit, uses externalReference, cleanup on failure |
| `src/lib/api/flutterwave-transfer.ts` | **Updated** — added `getPayoutBalance()` function |
| `src/components/withdrawal-modal.tsx` | **Updated** — calls /transfer, handles new response shape, removes userId from body |
| `docs/CODEBASE_MAP.md` | **Updated** — removed initiate route from API table |
| `vercel.json` | **Updated** — added release-deposit-holds cron |
| `package.json` | **Updated** — added bcryptjs + @types/bcryptjs |

## Verification

- `bun add bcryptjs` — ✅ success
- `bun add -d @types/bcryptjs` — ✅ success
- `tsc --noEmit` — ✅ zero errors in source files (only stale `.next/` cache, resolves on next `next dev`)

## Outstanding Items

1. Migration 043 must be applied to Supabase (SQL editor or `supabase db push`)
2. `CRON_SECRET` env var must be set in Vercel project settings
3. `.next/types/` stale cache will regenerate on next `next dev` or `next build`
4. Daily cron schedules now total 6 — Vercel Pro plan recommended (Hobby max 2 concurrent)
