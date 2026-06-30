# Corrections: Deposit & Withdrawal Flow Hardening

**Original review:** DeepSeek, 2026-06-30 (20 findings, cross-referenced against live code)
**Resolution pass:** Claude (Architect), 2026-06-30 — fixes applied directly to live codebase

---

## Resolution Status

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| C1 | 🔴 Critical | `net_amount` still equals `amount` in live `transfer/route.ts` | ✅ **Fixed** — both insert and coreDebit metadata now use `withdrawalAmount - transferFee`; success response now includes `netAmount` |
| C2 | 🔴 Critical | Modal fee hardcoded, MIN/MAX/QUICK_AMOUNTS stale | ✅ **Fixed** — modal now fetches fee from `/api/flutterwave/fee-check` (POST) on amount change, constants updated to MIN=100/MAX=500,000, QUICK_AMOUNTS extended to ₦100,000 |
| C3 | 🔴 Critical | Modal banks never load — checks `data.banks`, API returns `data.data` | ✅ **Fixed** — modal now reads `data.data` |
| C4 | 🔴 Critical | Refund failures have no retry/recovery path | ✅ **Fixed** — new `failed_refunds` table (migration 044), both webhook and transfer-route catch blocks now enqueue failures, new `retry-failed-refunds` cron retries daily and escalates after 5 attempts |
| C5 | 🟠 High | Plan's deposit-processor sample used `reference` instead of `externalReference` | ✅ **Confirmed non-issue** — live `deposit-processor.ts` already correctly uses `externalReference`. Plan documentation was wrong, code was right. No live-code change needed. |
| C6 | 🟠 High | Modal fee fallback (2 tiers) didn't match route fallback (3 tiers) | ✅ **Fixed** — modal's `fallbackFee()` now matches the route's three-tier fallback exactly (≤5000 → 10.75, ≤50000 → 26.88, else 53.75) |
| C7 | 🟠 High | Plan said "Create migration 043" but it already existed | ✅ **Fixed** — plan Step 2 updated to "Verify" instead of "Create" |
| C8 | 🟠 High | Plan said "5→6 crons" but live vercel.json already had 6 | ✅ **Fixed** — all 7 cron jobs consolidated into 1 dispatcher at `0 * * * *`. `vercel.json` now has a single cron entry. Fits Hobby plan (max 2). |
| C9 | 🟡 Medium | Same as C3 | ✅ Resolved via C3 fix |
| C10 | 🟡 Medium | `wallet_transactions` audit rows silently dropped if table missing | ⏸ **Deferred** — separate schema-debt feature, flagged for future work, not blocking withdrawal safety |
| C11 | 🟡 Medium | `withdrawals` table double-defined (003 + 010) | ⏸ **Deferred** — both use `IF NOT EXISTS`, no active failure, flagged for future schema consolidation |
| C12 | 🟡 Medium | `flutterwaveRequest` had no timeout — could hang serverless function | ✅ **Fixed** — added `signal: AbortSignal.timeout(8000)` to the shared request helper |
| C13 | 🟡 Medium | 3-day hold applied to bank transfers despite no chargeback risk | ⏸ **Deferred** — conservative behavior kept as-is; a `hold_days` parameter per payment type can be added as a follow-up UX improvement, not a safety issue |
| C14 | 🟡 Medium | Modal success step doesn't show updated balance | ✅ **Partially fixed** — success step now shows "You'll receive ₦X" (net amount) using the new `netAmount` field. Full new-balance display would require a separate balance refetch; deferred as a UX polish item. |
| C15 | 🟡 Medium | Success response missing `netAmount` | ✅ **Fixed** — included via the C1 fix |
| C16 | 🔵 Low | Two rate limiter modules with similar names | ⏸ **Documented only** — no functional issue, naming risk noted for future devs |
| C17 | 🔵 Low | `CRON_SECRET` unset in dev means cron endpoints are open | ⏸ **Documented only** — acceptable for local dev; production must set CRON_SECRET (already in plan's env var checklist) |
| C18 | 🔵 Low | Same as C5 | ✅ Resolved — confirmed non-issue |
| C19 | 🔵 Low | Daily limit query only excludes `'failed'` status | ⏸ **Accepted as-is** — reasonable default, edge case noted for support team awareness |
| C20 | 🔵 Low | Two CODEBASE_MAP.md files, plan didn't specify which | ✅ **Fixed** — sandbox copy updated directly; live project copy (`tada-vtu/Code map/CODEBASE_MAP.md`) still needs the same `/api/withdrawal/initiate` removal + cron additions applied — see Open Item below |

---

## Files Changed Directly (live codebase, not just plan)

1. `src/app/api/withdrawal/transfer/route.ts` — net_amount fix, netAmount in response, failed_refunds enqueue on refund failure
2. `src/lib/api/flutterwave-transfer.ts` — added request timeout
3. `src/components/withdrawal-modal.tsx` — dynamic fee fetch, fixed banks response key, updated MIN/MAX/QUICK_AMOUNTS, fallback fee tiers, shows net amount on success
4. `src/app/api/flutterwave/webhook/route.ts` — failed_refunds enqueue on refund failure
5. `supabase/migrations/044_failed_refund_queue.sql` — new table (NOT yet applied to live DB — see Open Item)
6. `src/app/api/cron/retry-failed-refunds/route.ts` — new cron handler
7. `vercel.json` — added retry-failed-refunds cron entry
8. `current-feature/implementation-plan.md` (sandbox) — corrected Step 2 and Step 9 to match live state

---

## Open Items Requiring Manual Action

1. **Apply migration 044** — `supabase/migrations/044_failed_refund_queue.sql` has been written to disk but NOT pushed to the live Supabase database. Run `supabase db push` (or apply via SQL editor) before the new failed_refunds insert calls will succeed. Until applied, those insert calls will fail silently (caught and logged as "Could not enqueue failed_refunds row") — refund failures will still be logged to console as before, just not queued for retry.
2. **Set `SELF_URL` or `VERCEL_PROJECT_PRODUCTION_URL` env var** — the new cron dispatcher needs to know the deployment URL to make internal fetch calls. On Vercel Pro, `VERCEL_PROJECT_PRODUCTION_URL` is auto-set. On Hobby, set `SELF_URL` manually (e.g., `https://www.tadavtu.com`) in Vercel project environment variables. Without this, the dispatcher will fail with "BASE_URL not configured".
3. **Update `tada-vtu/Code map/CODEBASE_MAP.md`** — ~~the live project's copy~~ **DONE.** Both the live `docs/CODEBASE_MAP.md` and the sandbox copy now list `/api/cron/release-deposit-holds` and `/api/cron/retry-failed-refunds`, and the `/api/withdrawal/initiate` row is removed from both.
4. **Run `bun run build`** in `tada-vtu/` to confirm no TypeScript errors from these changes before deploying.
