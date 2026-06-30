# Corrections & Gap Analysis — Withdrawal & Automated Refund

## CRITICAL BUGS

### C1. `atomic_refund` crashes on NOT NULL constraint (FIXED in migration 040)
**File:** `supabase/migrations/035_idempotency_and_atomic_debit.sql:197-203`  
**Severity:** Critical — money stuck permanently  
**Description:** The `wallet_transactions` table has `NOT NULL` constraints on `balance_before` and `balance_after`, but the original `atomic_refund()` inserted without those columns. The `EXCEPTION WHEN undefined_table THEN NULL` handler does not catch NOT NULL violations. Every programmatic refund silently failed with `null value in column "balance_before" violates not-null constraint`.  
**Fix:** Migration 040 adds `SELECT balance ... FOR UPDATE` before the credit and passes both `v_current_balance` and `v_new_balance` to the `INSERT`.

### C2. Fee-check API uses GET but frontend sends POST (FIXED)
**File:** `src/app/api/flutterwave/fee-check/route.ts` & `src/components/bank-withdrawal-modal.tsx:135-139`  
**Severity:** High — wrong fee displayed for all withdrawals  
**Description:** The route only exported `GET`, but the frontend sends `POST`. This always returned 405, triggering the catch-block fallback fees (₦10/₦25/₦50) instead of real Flutterwave transfer fees (₦10.75/₦26.88/₦53.75). The error was silent — users saw a slightly lower `totalDebit` than reality.  
**Fix:** Added `POST` handler that calls `getTransferFee(amount)` and returns `{ status: 'success', fee }`.

### C3. Webhook silently swallows refund failures (FIXED)
**File:** `src/app/api/flutterwave/webhook/route.ts:204-206`  
**Severity:** High — no audit trail when refund fails  
**Description:** The original catch block only did `console.error(...)` and continued to mark the withdrawal as `failed` without indicating the refund never happened. No notification was sent to the user or admin.  
**Fix:** Updated to prepend `"REFUND FAILED: "` to `failure_reason`, insert an error notification for the user, and log the event as `processed`.

---

## UNSAFE IMPLEMENTATIONS

### U1. PIN hashing is reversible / not a real hash
**File:** `src/app/api/withdrawal/transfer/route.ts:26-28`  
**Severity:** High — credential stored as reversible encoding  
**Detail:**
```typescript
function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}
```
This is base64 encoding, not hashing. Anyone with database access (or who reads the source) can trivially decode the PIN. The salt is static and embedded in the source code.  
**Recommendation:** Use `crypto.createHash('sha256').update(pin + user-specific-salt).digest('hex')` with a per-user random salt stored in `profiles.pin_salt`.

### U2. `getTransferFee` not wrapped in try-catch
**File:** `src/app/api/withdrawal/transfer/route.ts:83`  
**Severity:** Medium — Flutterwave API failure crashes withdrawal  
**Detail:** `getTransferFee()` queries Flutterwave's `/transfers/fee` endpoint. If Flutterwave is unreachable or slow, this throws. There is no try-catch around line 83 — the error propagates to the outer catch block (line 237) which returns a generic `"Withdrawal failed"` message with no specific guidance.  
**Fix:** Wrap in a try-catch with fallback to hardcoded fee brackets (₦10.75/₦26.88/₦53.75).

### U3. No rate limiting on withdrawal endpoint
**File:** `src/app/api/withdrawal/transfer/route.ts`  
**Severity:** Medium — rapid-fire withdrawals possible  
**Detail:** Each call generates a unique reference with `Date.now() + Math.random()`, so no idempotency key prevents duplicate submissions. A user with sufficient balance could rapidly call the endpoint multiple times, creating multiple withdrawal records and debit attempts. The atomics prevent double-debits for the same reference, but each call creates a new reference, so each succeeds independently.  
**Recommendation:** Add a per-user cooldown (e.g., reject if a withdrawal exists with `status IN ('pending','processing')` in the last 60 seconds) or enforce server-side throttling.

### U4. Flutterwave secret key error exposes stack trace to client in some paths
**File:** `src/lib/api/flutterwave-transfer.ts:51-53`  
**Severity:** Low  
**Detail:** `throw new Error('FLUTTERWAVE_SECRET_KEY not configured')` — if this propagates to the outer catch in the withdrawal route, the error message is returned verbatim to the client (line 239-241). This leaks internal configuration state.  
**Fix:** Map specific setup errors to generic messages before returning to the client.

---

## EDGE CASES & MISSING VALIDATION

### E1. `net_amount` in withdrawals is set to gross amount (misleading)
**File:** `src/app/api/withdrawal/transfer/route.ts:94`  
**Detail:** `net_amount: withdrawalAmount` stores the gross withdrawal amount, not the net (after fee). If a report or admin panel uses `net_amount` to calculate what the user actually received in their bank, it would be wrong.  
**Fix:** Should be `net_amount: withdrawalAmount - transferFee` (though `net_amount` may be unused — check before changing).

### E2. No validation that bank code is a valid Nigerian bank
**File:** `src/app/api/withdrawal/transfer/route.ts`  
**Detail:** The frontend fetches banks from `/api/withdrawal/banks` and presents a dropdown, but the backend does not re-validate that the submitted `bankCode` exists in Flutterwave's bank list. A modified client could send an arbitrary code.  
**Recommendation:** Either validate `bankCode` against `getBanks()` on the backend, or trust the frontend selection (current approach — acceptable for v1).

### E3. Webhook `transfer.completed` failure: no idempotency persistence for refund result outside atomic_refund
**File:** `src/app/api/flutterwave/webhook/route.ts:195-227`  
**Detail:** If `coreRefund` fails, the webhook marks the withdrawal as `REFUND FAILED` and notifies the user. But there is no retry mechanism — a subsequent webhook retry from Flutterwave would see `withdrawal.status === 'failed'` (with the `REFUND FAILED:` prefix) and skip the refund branch entirely (line 195). The money remains stuck until manual intervention.  
**Recommendation:** Store a `refund_retry_count` or `refund_status` column on `withdrawals` so that a retried webhook can attempt the refund again (up to N retries).

### E4. `completed_at` not set on failed withdrawals
**File:** `src/app/api/flutterwave/webhook/route.ts:212-218`  
**Detail:** The SUCCESSFUL branch sets `completed_at: new Date().toISOString()` (line 185), but the FAILED branch does not. A `completed_at` on failure could be useful for debugging.  
**Recommendation:** Set `completed_at` on both branches, or rename the column to `resolved_at`.

### E5. Emoji in notification title may render inconsistently
**File:** `src/app/api/withdrawal/transfer/route.ts:182`  
**Detail:** `title: 'Withdrawal Processing 💸'` — the emoji may render as boxes or question marks on some devices or in database tools. Not a functional issue, but consider using plain text titles.

---

## AMBIGUOUS SPECS

### A1. Two refund paths — which runs when?
**Files:**
- `src/app/api/withdrawal/transfer/route.ts:207-213` (route-level refund)
- `src/app/api/flutterwave/webhook/route.ts:197-206` (webhook-level refund)

**The route-level refund runs only when `initiateTransfer()` returns `success: false` synchronously** (e.g., Flutterwave immediately rejects with "insufficient balance in merchant account").  
**The webhook-level refund runs when Flutterwave accepted the transfer (returned `success: true`) but later asynchronously failed it.**

These two paths are **mutually exclusive** for a single withdrawal attempt because:
- If Flutterwave rejects synchronously, no `flw_reference` is set, and no webhook fires
- If Flutterwave accepts synchronously, the route returns success to the frontend, and the webhook handles the async result

However, `flw_reference` is updated at line 176 *after* the success check — if the route fails after that update (e.g., notifications insert throws), the flw_reference is set but the route returns an error. A subsequent webhook would see a valid flw_reference but the user saw an error. This is unlikely but possible.

### A2. Fee-check endpoint serves two different response shapes
**File:** `src/app/api/flutterwave/fee-check/route.ts`

| Method | Caller | Response Shape |
|--------|--------|----------------|
| GET    | `fund-wallet/page.tsx` | `{ status, data: { wallet_credit, service_fee, total_to_pay, ... } }` |
| POST   | `bank-withdrawal-modal.tsx` | `{ status, fee }` |

The two response shapes are incompatible. If a future component calls the wrong method, it will get unexpected data.  
**Recommendation:** Normalize the response shapes or add an explicit `type: 'funding' | 'withdrawal'` parameter.

---

## DOCUMENTATION & SCHEMA GAPS

### G1. `wallet_transactions` table definition not in migrations
The `wallet_transactions` table does not have a `CREATE TABLE` statement in any local migration file. It was presumably created via Supabase dashboard or an earlier out-of-repo migration. This makes it impossible to recreate the schema from migrations alone. The NOT NULL constraint on `balance_before`/`balance_after` was not visible until runtime.  
**Recommendation:** Add a `CREATE TABLE IF NOT EXISTS wallet_transactions` migration that documents the exact schema.

### G2. No migration rollback script for 040
Migration 040 uses `CREATE OR REPLACE FUNCTION`, which is idempotent forward but cannot be rolled back automatically. If 040 needs to be reverted, the original `atomic_refund` from migration 035 must be re-applied manually.  
**Recommendation:** Acceptable for this type of fix, but worth noting.

### G3. Withdrawals table constraint check uses lowercase statuses
**File:** `supabase/migrations/003_withdrawals.sql:12`  
`CHECK (status IN ('pending', 'processing', 'success', 'failed'))` — all lowercase. But the webhook compares against `'FAILED'` and `'SUCCESSFUL'` (uppercase, Flutterwave's format). These are not the same values — the comparison is against Flutterwave's event status (`data.status`), not the database column. The code correctly compares `data.status === 'FAILED'` then sets `withdrawal.status = 'failed'`. No bug, but the naming overlap is confusing.

---

## SUMMARY OF REQUIRED ACTIONS

| ID | Priority | Action | Est. Effort |
|----|----------|--------|-------------|
| C1 | **Critical** | ✅ Already fixed (migration 040) — must be applied to Supabase | 0 |
| C2 | High | ✅ Already fixed (POST handler added) | 0 |
| C3 | High | ✅ Already fixed (webhook error handling improved) | 0 |
| U1 | **High** | Replace base64 PIN with real SHA-256 + per-user salt | 1-2h |
| U2 | Medium | Wrap `getTransferFee` in try-catch | 15min |
| U3 | Medium | Add per-user cooldown on withdrawal | 1h |
| E1 | Low | Fix `net_amount` calculation | 5min |
| E3 | Medium | Add retry mechanism for failed webhook refunds | 2-3h |
| G1 | Medium | Add wallet_transactions CREATE TABLE migration | 30min |
