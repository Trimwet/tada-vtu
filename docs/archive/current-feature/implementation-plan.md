# Implementation Plan: Deposit & Withdrawal Flow Hardening

**Revision:** v2 (post-DeepSeek corrections C1–C20)
**Changes from v1:** Added withdrawal-modal.tsx to scope (C1, C2, C6, C16); fixed hold insert ordering (C4); moved getTransferFee before PIN verify (C9); fixed net_amount (C5); added CRON_SECRET documentation (C8); added CODEBASE_MAP.md update (C7).

---

## Risk Level

🔴 **High Risk** — touches the live wallet balance logic, withdrawal execution path, deposit crediting pipeline, transaction PIN security, and the only frontend withdrawal modal. Any bug here directly affects user money.

---

## Corrections Applied From DeepSeek Review

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| C1 | 🔴 Critical | Modal still calls `/api/withdrawal/initiate` | **Applied** — added modal to scope |
| C2 | 🔴 Critical | Response shape mismatch (success vs status) | **Applied** — modal updated to handle new shape |
| C3 | 🔴 Critical | Modal sends userId in body; route uses session | **Rejected** — route correctly ignores body userId and uses session. Stop sending userId is a side-effect of C1 fix. No extra action needed. |
| C4 | 🟠 High | Hold inserted AFTER coreDeposit (race window) | **Applied** — insert hold BEFORE coreDeposit, delete on failure |
| C5 | 🟠 High | net_amount duplicates amount, not amount minus fee | **Applied** — fixed to `withdrawalAmount - transferFee` |
| C6 | 🟡 Medium | Modal hardcodes fees and limits that don't match route | **Applied** — modal fee display now calls fee-check API dynamically |
| C7 | 🟡 Medium | CODEBASE_MAP.md references deleted route | **Applied** — added CODEBASE_MAP.md update step |
| C8 | 🟡 Medium | CRON_SECRET env var not documented | **Applied** — added to env var checklist |
| C9 | 🟡 Medium | getTransferFee called after bcrypt PIN verify | **Applied** — moved to before PIN verify |
| C10 | 🔵 Low | wallet_transactions missing dedicated migration | **Deferred** — existing schema debt, not in scope |
| C11 | 🔵 Low | withdrawals table double-defined (003 + 010) | **Deferred** — not blocking, not in scope |
| C12 | 🔵 Low | Modal min-amount differs from route | **Applied** — covered by C6 fix (align constants) |
| C13 | 🔵 Low | Duplicate Supabase admin client creation | **Rejected** — consistent with existing codebase pattern |
| C14 | 🔵 Low | Go Core unaware of holds | **Documented** — architectural decision, single entry point enforced |
| C15 | 🔵 Low | deposit_holds missing unique constraint | **Rejected** — UNIQUE is already in the migration SQL (line 60) |
| C16 | 🟠 High | Fee function divergence (calculateWithdrawalFee vs getTransferFee) | **Applied** — modal now uses fee-check API, documents the divergence |
| C17 | 🔴 Critical | Hold uses walletCredit not gross_amount | **Rejected** — DeepSeek's own analysis confirmed this is correct ✅ |
| C18 | 🟡 Medium | Progressive delay not applied to PIN failures | **Deferred** — minor improvement, separate feature |
| C19 | 🔵 Low | Vercel Hobby cron limit (max 2 concurrent) | **Documented** — note added to Step 8 |
| C20 | 🟡 Medium | pin column TEXT length check | **Rejected** — TEXT has no limit, bcrypt 60-char fits fine ✅ |

---

## Files to Delete

| File | Reason |
|------|--------|
| `src/app/api/withdrawal/initiate/route.ts` | Ghost route with no session auth. Takes userId from request body. Superseded by /api/withdrawal/transfer/route.ts. |

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/043_deposit_hold_period.sql` | Creates deposit_holds table + get_withdrawable_balance() RPC + release_expired_holds() RPC |
| `src/app/api/cron/release-deposit-holds/route.ts` | Cron handler — marks expired holds as released |

---

## Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/api/withdrawal/transfer/route.ts` | Bcrypt PIN check, fee-first ordering, withdrawable balance check, daily limit check, FLW payout balance check, net_amount fix, rate limiting |
| `src/lib/api/deposit-processor.ts` | Insert hold BEFORE coreDeposit; delete hold if coreDeposit fails |
| `src/lib/api/flutterwave-transfer.ts` | Add getPayoutBalance() function |
| `src/components/withdrawal-modal.tsx` | Call /api/withdrawal/transfer, handle new response shape, fetch fee dynamically, align limits |
| `vercel.json` | Add release-deposit-holds cron schedule |
| `package.json` | Add bcryptjs + @types/bcryptjs |
| `Code map/CODEBASE_MAP.md` | Remove /api/withdrawal/initiate row from section 3.10 |

---

## Database Changes

### Migration 043 — `043_deposit_hold_period.sql`

**Location:** `supabase/migrations/043_deposit_hold_period.sql`

**Purpose:** Introduces a non-destructive deposit hold system. When a deposit is credited by coreDeposit(), a companion record is inserted into deposit_holds BEFORE the credit tracking how much of that credit is locked for 3 days. The user's balance column still holds the full credited amount. The hold prevents that credited amount from being withdrawn until release_at clears.

**Why this approach (not a pending_balance column):** The existing atomic_deposit() RPC is proven, idempotent, and deployed. The hold table is additive — zero changes to atomic_deposit, zero risk of breaking deposits.

**Architectural note:** The deposit hold system depends on processDeposit() being the single entry point for all deposits. Any future deposit paths (new webhook handlers, admin credits) must also call processDeposit() or manually create a hold record.

```sql
-- ============================================================
-- Migration 043: Deposit Hold Period (3-day chargeback buffer)
-- ============================================================

-- 1. Create deposit_holds table
CREATE TABLE IF NOT EXISTS public.deposit_holds (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_credit         DECIMAL(12,2) NOT NULL,
  gross_amount          DECIMAL(12,2) NOT NULL,
  transaction_reference TEXT          NOT NULL UNIQUE,
  release_at            TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  is_released           BOOLEAN       NOT NULL DEFAULT false,
  released_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_deposit_holds_user_id
  ON public.deposit_holds (user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_holds_unreleased
  ON public.deposit_holds (user_id, is_released, release_at)
  WHERE is_released = false;

CREATE INDEX IF NOT EXISTS idx_deposit_holds_release_at
  ON public.deposit_holds (release_at)
  WHERE is_released = false;

-- 3. RLS
ALTER TABLE public.deposit_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holds" ON public.deposit_holds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages holds" ON public.deposit_holds
  FOR ALL USING (auth.role() = 'service_role');

-- 4. get_withdrawable_balance(user_id)
--    Returns balance minus any unreleased holds still within their lock window.
--    Called by the withdrawal route before coreDebit().
CREATE OR REPLACE FUNCTION public.get_withdrawable_balance(p_user_id UUID)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(12,2);
  v_locked  DECIMAL(12,2);
BEGIN
  SELECT COALESCE(balance, 0)
  INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT COALESCE(SUM(wallet_credit), 0)
  INTO v_locked
  FROM public.deposit_holds
  WHERE user_id = p_user_id
    AND is_released = false
    AND release_at > NOW();

  RETURN GREATEST(v_balance - v_locked, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_withdrawable_balance TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_withdrawable_balance FROM PUBLIC;

-- 5. release_expired_holds()
--    Called by the cron job. Marks holds as released so the index stays small.
--    No balance changes needed — balance was already fully credited at deposit time.
CREATE OR REPLACE FUNCTION public.release_expired_holds()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.deposit_holds
  SET is_released = true,
      released_at = NOW()
  WHERE is_released = false
    AND release_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_expired_holds TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_expired_holds FROM PUBLIC;

COMMENT ON TABLE public.deposit_holds IS
  '3-day chargeback hold on deposited funds. A hold prevents the credited amount from being withdrawn until release_at passes. The balance column on profiles is NOT changed by holds — holds are purely a read-side constraint checked by get_withdrawable_balance(). Hold is inserted BEFORE coreDeposit() credits the balance; deleted if coreDeposit fails.';
```

---

## Environment Variables Required

The following env vars must be confirmed/added in Vercel project settings before deployment:

| Variable | Already Set | Notes |
|----------|-------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Used by admin Supabase client |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Used by admin Supabase client |
| `FLUTTERWAVE_SECRET_KEY` | ✅ Yes | Used by getPayoutBalance() |
| `CRON_SECRET` | ⚠️ Verify | Must be set to secure all cron endpoints. Set to a random 32-char string. On Vercel, this is used as the Bearer token for cron authentication. |
| `SELF_URL` | ❌ New | **Required for Hobby plan.** The cron dispatcher needs to know its own deployment URL to make internal fetch calls. Must be the production URL (e.g., `https://www.tadavtu.com`). On Vercel Pro, `VERCEL_PROJECT_PRODUCTION_URL` is auto-set; on Hobby, set `SELF_URL` manually. |

---

## Detailed Steps

### Step 1 — Install bcryptjs

From the `tada-vtu/` directory:

```bash
bun add bcryptjs
bun add -d @types/bcryptjs
```

Verify `package.json` shows `bcryptjs` in dependencies.

---

### Step 2 — Verify Migration 043 (already applied)

**Status: COMPLETE.** Migration 043 (`deposit_hold_period.sql`) has already been created and applied to the live database. `deposit_holds` table, `get_withdrawable_balance()`, and `release_expired_holds()` all exist. No action needed — verify only:

```bash
supabase db push --dry-run
```

---

### Step 3 — Delete the ghost route

Delete `src/app/api/withdrawal/initiate/route.ts` entirely.

Search the codebase for `withdrawal/initiate` to confirm no other active file references it besides `withdrawal-modal.tsx` (which will be fixed in Step 7). Any hit in admin docs or config is OK. Any hit in active API client code must be updated to use `/api/withdrawal/transfer` instead.

---

### Step 4 — Add `getPayoutBalance()` to `flutterwave-transfer.ts`

Open `src/lib/api/flutterwave-transfer.ts`. Add before the existing `initiateTransfer` export:

```typescript
/**
 * Returns the available NGN balance in the Flutterwave payout account.
 * Used by the withdrawal route to pre-check before debiting the user.
 * Returns null on error — treat as unknown. Never block withdrawal on null.
 */
export async function getPayoutBalance(): Promise<number | null> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const response = await fetch('https://api.flutterwave.com/v3/balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const ngnEntry = (data.data as Array<{ currency: string; available_balance: number }> | undefined)
      ?.find((b) => b.currency === 'NGN');

    return ngnEntry?.available_balance ?? null;
  } catch {
    return null; // Network error — fail open, do not block withdrawal
  }
}
```

---

### Step 5 — Update `deposit-processor.ts` (hold BEFORE credit)

This is the fix for C4 (race window). The hold must be inserted BEFORE coreDeposit() credits the balance. If coreDeposit() fails, delete the hold.

Replace the relevant section of `src/lib/api/deposit-processor.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key);
}

const HOLD_DAYS = 3;

export async function processDeposit(data: DepositData): Promise<CoreDepositResult> {
  const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

  console.log(`🚀 [DEPOSIT] user=${userId} ref=${reference} credit=₦${walletCredit} fee=₦${fee}`);

  const supabase = getSupabaseAdmin();
  const releaseAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let holdInserted = false;

  try {
    // STEP A: Insert hold BEFORE crediting (closes the race window from C4)
    // If this fails, we abort — no credit, no stuck money
    try {
      const { error: holdError } = await supabase.from('deposit_holds').insert({
        user_id:               userId,
        wallet_credit:         Math.max(walletCredit, 0),
        gross_amount:          amount,
        transaction_reference: reference,
        release_at:            releaseAt,
      });

      if (holdError) {
        // Duplicate reference = already processed (idempotent call) — log and continue
        if (holdError.code === '23505') {
          console.log(`[DEPOSIT] idempotent hold — reference already exists: ${reference}`);
        } else {
          console.error(`[DEPOSIT] ⚠ hold pre-insert failed for ${reference}:`, holdError.message);
          // Non-idempotency hold failure: proceed anyway (hold is best-effort safety, not hard block)
          // The alternative of blocking the deposit entirely could deny legitimate payments
        }
      } else {
        holdInserted = true;
        console.log(`[DEPOSIT] 🔒 hold pre-created, releases at ${releaseAt}`);
      }
    } catch (holdErr) {
      console.error(`[DEPOSIT] ⚠ hold pre-insert exception for ${reference}:`, holdErr);
      // Continue — do not block deposit over hold failure
    }

    // STEP B: Credit the balance
    const result = await coreDeposit({
      userId,
      amount,
      walletCredit: Math.max(walletCredit, 0),
      fee,
      reference,
      externalReference,
      paymentType,
      description,
      metadata,
    });

    if (result.alreadyProcessed) {
      console.log(`[DEPOSIT] idempotent — already processed: ${reference}`);
    } else {
      console.log(`✅ [DEPOSIT] done user=${userId} new_balance=₦${result.newBalance}`);
    }

    return result;

  } catch (error) {
    // STEP C: coreDeposit failed — clean up the pre-inserted hold so balance stays consistent
    if (holdInserted) {
      try {
        await supabase
          .from('deposit_holds')
          .delete()
          .eq('transaction_reference', reference);
        console.log(`[DEPOSIT] 🗑 hold deleted after coreDeposit failure: ${reference}`);
      } catch (deleteErr) {
        // Hold stays orphaned — balance was never credited so the hold causes no harm
        // (get_withdrawable_balance will subtract it, but balance is 0 from this deposit anyway)
        console.error(`[DEPOSIT] ⚠ hold cleanup failed for ${reference}:`, deleteErr);
      }
    }

    console.error(`❌ [DEPOSIT] failed ref=${reference}:`, error);
    throw error;
  }
}
```

---

### Step 6 — Rewrite `withdrawal/transfer/route.ts`

Replace the entire route. Key changes from v1 plan:
1. `getTransferFee()` moved to **before** PIN verify (C9 fix)
2. `net_amount` fixed to `withdrawalAmount - transferFee` (C5 fix)
3. Bcrypt PIN verify with base64 legacy fallback and auto-rehash
4. Withdrawable balance check via `get_withdrawable_balance()` RPC
5. Daily limit check from `withdrawals` table (DB-level, survives restarts)
6. Flutterwave payout balance pre-check
7. Rate limiting via `checkRateLimit()`

```typescript
/**
 * POST /api/withdrawal/transfer
 *
 * Hardened bank withdrawal via Flutterwave.
 *
 * Flow:
 *   1. Auth via session
 *   2. Rate limit check
 *   3. Input validation
 *   4. Fee fetch (BEFORE PIN — fast-fail if Flutterwave is down)
 *   5. PIN verify (bcrypt with base64 legacy fallback + auto-rehash)
 *   6. Withdrawable balance check (balance minus held deposits)
 *   7. Daily limit check (max 3 withdrawals / ₦200,000 per day — DB query)
 *   8. Flutterwave payout balance check
 *   9. Create withdrawals record
 *  10. coreDebit() — atomic, no-overdraft
 *  11. Flutterwave transfer
 *  12a. Success → update records + notify
 *  12b. Failure → coreRefund() + update records + notify
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { initiateTransfer, getTransferFee, getPayoutBalance } from '@/lib/api/flutterwave-transfer';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { checkRateLimit } from '@/lib/rate-limiter';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_WITHDRAWAL     = 100;
const MAX_WITHDRAWAL     = 500_000;
const DAILY_MAX_COUNT    = 3;
const DAILY_MAX_AMOUNT   = 200_000;
const FLW_BALANCE_BUFFER = 10_000;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, key);
}

// ── PIN helpers ───────────────────────────────────────────────────────────────
const LEGACY_SALT = 'tada_salt_2024';

function legacyHash(pin: string): string {
  return Buffer.from(pin + LEGACY_SALT).toString('base64');
}

async function verifyAndMaybeRehashPin(
  pin: string,
  storedHash: string,
  userId: string,
  adminSupabase: ReturnType<typeof getSupabaseAdmin>
): Promise<boolean> {
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(pin, storedHash);
  }

  // Legacy base64 path
  if (legacyHash(pin) !== storedHash) return false;

  // Migrate to bcrypt silently on success
  try {
    const newHash = await bcrypt.hash(pin, 12);
    await adminSupabase.from('profiles').update({ pin: newHash }).eq('id', userId);
    console.log(`[WITHDRAWAL] PIN migrated to bcrypt for user ${userId}`);
  } catch (e) {
    console.error('[WITHDRAWAL] bcrypt migration failed (non-blocking):', e);
  }

  return true;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Session auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rateCheck = checkRateLimit(`withdrawal:${user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        status: 'error',
        message: `Too many attempts. Please wait ${rateCheck.retryAfter} seconds.`,
      }, { status: 429 });
    }

    // 3. Input validation
    const { bankCode, bankName, accountNumber, accountName, amount, pin } = await request.json();

    if (!bankCode || !accountNumber || !accountName || !amount) {
      return NextResponse.json({ status: 'error', message: 'All fields are required' }, { status: 400 });
    }
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ status: 'error', message: 'Please enter your 4-digit PIN' }, { status: 400 });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({
        status: 'error',
        message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`,
      }, { status: 400 });
    }
    if (withdrawalAmount > MAX_WITHDRAWAL) {
      return NextResponse.json({
        status: 'error',
        message: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}`,
      }, { status: 400 });
    }

    // 4. Fee fetch BEFORE PIN verify (C9 fix: fast-fail if Flutterwave is down)
    let transferFee: number;
    try {
      transferFee = await getTransferFee(withdrawalAmount);
    } catch {
      // Fallback fee brackets if API is unreachable
      transferFee = withdrawalAmount < 5_000 ? 10.75 : withdrawalAmount <= 50_000 ? 26.88 : 53.75;
      console.warn('[WITHDRAWAL] getTransferFee API failed — using fallback fee:', transferFee);
    }
    const totalDebit = withdrawalAmount + transferFee;

    const adminSupabase = getSupabaseAdmin();

    // 5. PIN verification
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('pin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
    }
    if (!profile.pin) {
      return NextResponse.json({ status: 'error', message: 'Please set up your transaction PIN first' }, { status: 400 });
    }

    const pinValid = await verifyAndMaybeRehashPin(String(pin), profile.pin, user.id, adminSupabase);
    if (!pinValid) {
      return NextResponse.json({ status: 'error', message: 'Invalid transaction PIN' }, { status: 401 });
    }

    // 6. Withdrawable balance check
    const { data: withdrawableData, error: withdrawableError } = await adminSupabase
      .rpc('get_withdrawable_balance', { p_user_id: user.id });

    if (withdrawableError) {
      console.error('[WITHDRAWAL] get_withdrawable_balance error:', withdrawableError);
      return NextResponse.json({ status: 'error', message: 'Could not verify balance. Please try again.' }, { status: 500 });
    }

    const withdrawable = withdrawableData as number;
    if (withdrawable < totalDebit) {
      // Fetch actual balance to see if holds are the cause
      const { data: profileBalance } = await adminSupabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      const actualBalance = profileBalance?.balance ?? 0;
      const heldAmount    = actualBalance - withdrawable;
      const holdMessage   = heldAmount > 0
        ? ` ₦${heldAmount.toLocaleString()} is on a 3-day hold from a recent deposit.`
        : '';

      return NextResponse.json({
        status: 'error',
        message: `Insufficient withdrawable balance. You need ₦${totalDebit.toLocaleString()} (₦${withdrawalAmount.toLocaleString()} + ₦${transferFee.toLocaleString()} fee).${holdMessage}`,
      }, { status: 400 });
    }

    // 7. Daily limit check (DB-level)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayWithdrawals, error: dailyError } = await adminSupabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .neq('status', 'failed')
      .gte('created_at', todayStart.toISOString());

    if (!dailyError && todayWithdrawals) {
      const dailyCount = todayWithdrawals.length;
      const dailyTotal = todayWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

      if (dailyCount >= DAILY_MAX_COUNT) {
        return NextResponse.json({
          status: 'error',
          message: `Daily withdrawal limit reached (${DAILY_MAX_COUNT} per day). Try again tomorrow.`,
        }, { status: 429 });
      }

      if (dailyTotal + withdrawalAmount > DAILY_MAX_AMOUNT) {
        const remaining = DAILY_MAX_AMOUNT - dailyTotal;
        return NextResponse.json({
          status: 'error',
          message: `Daily amount limit reached. You can withdraw up to ₦${remaining.toLocaleString()} more today.`,
        }, { status: 429 });
      }
    } else if (dailyError) {
      console.error('[WITHDRAWAL] daily limit query error (non-blocking):', dailyError);
    }

    // 8. Flutterwave payout balance pre-check (fail-open on API error)
    const flwBalance = await getPayoutBalance();
    if (flwBalance !== null && flwBalance < withdrawalAmount + FLW_BALANCE_BUFFER) {
      console.warn(`[WITHDRAWAL] FLW balance low: ₦${flwBalance} < required ₦${withdrawalAmount + FLW_BALANCE_BUFFER}`);
      return NextResponse.json({
        status: 'error',
        message: 'Withdrawal service is temporarily at capacity. Please try again in a few hours or contact support.',
      }, { status: 503 });
    }

    // 9. Create withdrawal record
    const reference   = `TADA-WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const description = `Withdrawal to ${accountName} (${accountNumber})`;

    const { error: withdrawalError } = await adminSupabase.from('withdrawals').insert({
      user_id:        user.id,
      amount:         withdrawalAmount,
      fee:            transferFee,
      net_amount:     withdrawalAmount - transferFee,   // C5 fix: what user actually receives
      account_number: accountNumber,
      account_name:   accountName,
      bank_code:      bankCode,
      bank_name:      bankName || 'Bank',
      status:         'processing',
      reference,
    });

    if (withdrawalError) {
      console.error('[WITHDRAWAL] record insert failed:', withdrawalError);
      return NextResponse.json({
        status: 'error',
        message: `Failed to create withdrawal record: ${withdrawalError.message}`,
      }, { status: 500 });
    }

    // 10. Atomic debit via Core
    try {
      await coreDebit({
        userId:      user.id,
        amount:      totalDebit,
        reference,
        serviceType: 'withdrawal',
        description,
        metadata: {
          bank_code:      bankCode,
          bank_name:      bankName,
          account_number: accountNumber,
          account_name:   accountName,
          fee:            transferFee,
          net_amount:     withdrawalAmount - transferFee,
        },
      });
    } catch (debitError) {
      await adminSupabase.from('withdrawals').delete().eq('reference', reference);
      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        return NextResponse.json({ status: 'error', message: 'Insufficient balance.' }, { status: 400 });
      }
      console.error('[WITHDRAWAL] coreDebit failed:', debitError);
      return NextResponse.json({ status: 'error', message: 'Failed to process withdrawal. Please try again.' }, { status: 500 });
    }

    // 11. Flutterwave transfer
    try {
      const transferResult = await initiateTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount:    withdrawalAmount,
        reference,
        userId:    user.id,
        narration: `TADA VTU Withdrawal - ${reference}`,
      });

      if (!transferResult.success) throw new Error(transferResult.message || 'Transfer failed');

      await adminSupabase
        .from('transactions')
        .update({ external_reference: transferResult.reference })
        .eq('reference', reference);

      await adminSupabase
        .from('withdrawals')
        .update({ flw_reference: transferResult.reference, status: 'processing' })
        .eq('reference', reference);

      await adminSupabase.from('notifications').insert({
        user_id: user.id,
        type:    'info',
        title:   'Withdrawal Processing',
        message: `Your withdrawal of ₦${withdrawalAmount.toLocaleString()} to ${accountName} is being processed.`,
      });

      return NextResponse.json({
        status:  'success',
        message: 'Withdrawal initiated successfully',
        data: {
          reference:     transferResult.reference,
          amount:        withdrawalAmount,
          fee:           transferFee,
          netAmount:     withdrawalAmount - transferFee,
          totalDebit,
          accountName,
          accountNumber,
          status:        transferResult.status,
        },
      });

    } catch (transferError) {
      const errorMessage = transferError instanceof Error ? transferError.message : 'Transfer failed';
      console.error('[WITHDRAWAL] transfer error:', errorMessage);

      // 12b. Refund on failure
      try {
        await coreRefund({
          userId:            user.id,
          amount:            totalDebit,
          reference:         `REFUND_${reference}`,
          originalReference: reference,
          description:       `Withdrawal refund - ${reference}`,
        });
      } catch (refundError) {
        console.error(
          '[WITHDRAWAL] ⚠️ MANUAL ACTION REQUIRED — refund failed after transfer failure.',
          { reference, userId: user.id, totalDebit, errorMessage, refundError }
        );
        return NextResponse.json({
          status:  'error',
          message: 'Transfer failed and refund could not be completed automatically. Support has been alerted — reference: ' + reference,
        }, { status: 502 });
      }

      await adminSupabase
        .from('withdrawals')
        .update({ status: 'failed', failure_reason: errorMessage })
        .eq('reference', reference);

      let userMessage = 'Transfer failed. Your balance has been refunded.';
      if (errorMessage.includes('IP Whitelisting')) {
        userMessage = 'Withdrawal service temporarily unavailable. Please try again later.';
      } else if (errorMessage.toLowerCase().includes('insufficient') || errorMessage.toLowerCase().includes('balance')) {
        userMessage = 'Withdrawal service balance insufficient. Please contact support.';
      }

      return NextResponse.json({ status: 'error', message: userMessage }, { status: 500 });
    }

  } catch (error) {
    console.error('[WITHDRAWAL] Unexpected error:', error);
    return NextResponse.json({
      status:  'error',
      message: 'An unexpected error occurred. Please try again.',
    }, { status: 500 });
  }
}
```

---

### Step 7 — Update `withdrawal-modal.tsx` (C1 + C2 + C6 fix)

This is the most visible change to users. The modal must:
1. Call `/api/withdrawal/transfer` instead of `/api/withdrawal/initiate` — do NOT send `userId` in the body
2. Handle the new response shape: check `data.status === 'success'` not `data.success`
3. Fetch transfer fee dynamically from `/api/flutterwave/fee-check` (POST) instead of hardcoding ₦36/₦52
4. Update client-side min/max to match the route: MIN=₦100, MAX=₦500,000
5. Access success data from `data.data.reference` etc. (nested under `data` key)

OpenCode must read `withdrawal-modal.tsx` in full before editing it. The specific changes:

**Constants to update:**
```typescript
// OLD
const MIN_WITHDRAWAL = 500;
const MAX_WITHDRAWAL = 50000;

// NEW
const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500000;
```

**Fee fetch — replace hardcoded calculation:**
```typescript
// OLD (hardcoded)
const fee = amount < 5000 ? 36 : 52;

// NEW (dynamic — call fee-check endpoint)
const feeResponse = await fetch('/api/flutterwave/fee-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: withdrawalAmount }),
});
const feeData = await feeResponse.json();
const transferFee = feeData.status === 'success' ? feeData.fee : (withdrawalAmount < 5000 ? 10.75 : 26.88);
```

**Submission endpoint — replace initiate with transfer:**
```typescript
// OLD
const response = await fetch('/api/withdrawal/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, bankCode, bankName, accountNumber, accountName, amount, pin }),
});

// NEW (omit userId — route uses session auth)
const response = await fetch('/api/withdrawal/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bankCode, bankName, accountNumber, accountName, amount, pin }),
});
```

**Response handling — update success check:**
```typescript
// OLD
if (res.ok && data.success) {
  // use data.reference, data.amount, data.fee, data.accountName
}

// NEW
if (res.ok && data.status === 'success') {
  // use data.data.reference, data.data.amount, data.data.fee, data.data.accountName
}
```

---

### Step 8 — Create cron endpoint `release-deposit-holds/route.ts`

Create `src/app/api/cron/release-deposit-holds/route.ts`:

```typescript
/**
 * GET /api/cron/release-deposit-holds
 *
 * Marks deposit holds whose release_at has passed as released.
 * Purely housekeeping — does NOT change balances.
 * Secured by CRON_SECRET env var.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('release_expired_holds');

    if (error) {
      console.error('[CRON/release-holds] RPC error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const releasedCount = data as number;
    console.log(`[CRON/release-holds] Released ${releasedCount} expired holds`);
    return NextResponse.json({ success: true, released: releasedCount });
  } catch (err) {
    console.error('[CRON/release-holds] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}
```

---

### Step 9 — Replace `vercel.json` crons with single dispatcher

Replace the entire `crons` array. Vercel Hobby plan supports max 2 cron jobs; the project has 7 tasks. Consolidate into one master dispatcher that runs every hour and dispatches to the appropriate sub-cron based on UTC hour.

Remove all existing cron entries and add:

```json
{
  "path": "/api/cron/dispatcher",
  "schedule": "0 * * * *"
}
```

The dispatcher (`src/app/api/cron/dispatcher/route.ts`) maps hours to tasks:
- Hour 0 → vault expiry
- Hour 1 → release deposit holds
- Hour 2 → retry failed refunds
- Hour 3 → reconcile
- Hour 8 → verify payments
- Hour 12 → process transfers
- Hour 16 → process pending transactions
- Hour 23 → catch-up (runs vault-expiry + release-holds again if missed)

Each sub-cron file remains independently callable for testing. The dispatcher calls them via internal fetch using `CRON_SECRET` auth.

**⚠️ Hobby plan prerequisite:** Set `SELF_URL` env var to `https://www.tadavtu.com` (or your production URL) so the dispatcher knows where to send fetch requests. On Vercel Pro, `VERCEL_PROJECT_PRODUCTION_URL` is auto-set. Without a base URL, the dispatcher will fail with "BASE_URL not configured".

---

### Step 10 — Update `Code map/CODEBASE_MAP.md`

In sandbox file `Code map/CODEBASE_MAP.md` section 3.10 (Withdrawal Routes), remove the row for `/api/withdrawal/initiate` and add the new cron row:

**Remove from section 3.10:**
```
| POST | `/api/withdrawal/initiate` | Initiate withdrawal |
```

**Add to section 3.8 (Cron Routes):**
```
| GET | `/api/cron/release-deposit-holds` | Daily | Release expired deposit holds |
```

---

## Order of Execution (Critical — Do Not Reorder)

1. `bun add bcryptjs && bun add -d @types/bcryptjs`
2. Verify **Migration 043** is applied (already exists on disk)
3. Add `getPayoutBalance()` to `flutterwave-transfer.ts`
4. Update `deposit-processor.ts` (hold BEFORE credit)
5. **Update `withdrawal-modal.tsx`** (C1/C2/C3 fixes — must happen before step 6)
6. Rewrite `withdrawal/transfer/route.ts`
7. Delete `src/app/api/withdrawal/initiate/route.ts`
8. Create `src/app/api/cron/dispatcher/route.ts` (master cron, hour-based dispatch)
9. Replace `vercel.json` crons array with single dispatcher entry
10. Apply **Migration 044** (`supabase db push`) — creates `failed_refunds` table for refund retry queue
11. Update `Code map/CODEBASE_MAP.md`
12. Verify: `bun run build` or `tsc --noEmit` — must pass with zero errors
13. Confirm `CRON_SECRET` and `SELF_URL` are set in Vercel environment variables

---

## Acceptance Criteria

- [ ] `src/app/api/withdrawal/initiate/route.ts` does not exist
- [ ] `deposit_holds` table exists in Supabase with UNIQUE on transaction_reference
- [ ] `get_withdrawable_balance(uuid)` RPC exists and returns balance minus unreleased holds
- [ ] `release_expired_holds()` RPC exists and returns affected row count
- [ ] `bcryptjs` appears in `package.json` dependencies
- [ ] `withdrawal/transfer/route.ts` imports `bcrypt`, `checkRateLimit`, `getPayoutBalance`
- [ ] `withdrawal-modal.tsx` calls `/api/withdrawal/transfer` (not initiate)
- [ ] `withdrawal-modal.tsx` handles `data.status === 'success'` (not `data.success`)
- [ ] `withdrawal-modal.tsx` fetches fee dynamically via POST to `/api/flutterwave/fee-check`
- [ ] `withdrawal-modal.tsx` MIN_WITHDRAWAL = 100, MAX_WITHDRAWAL = 500,000
- [ ] Depositing and immediately trying to withdraw the full amount returns a hold message
- [ ] Making 4 withdrawals in one day is blocked after the 3rd succeeds
- [ ] Attempting to withdraw more than ₦200,000 total in one day is blocked
- [ ] A withdrawal with a base64 PIN succeeds AND the stored hash is updated to bcrypt afterward
- [ ] A withdrawal with a bcrypt PIN succeeds on subsequent attempts
- [ ] `GET /api/cron/release-deposit-holds` returns `{ success: true, released: N }`
- [ ] net_amount in withdrawals table equals amount minus fee (not amount)
- [ ] `bun run build` completes without TypeScript errors

---

## Rollback Strategy

All changes are additive or single-file replacements. Every modified file can be reverted via git.

- **Migration 043:** `DROP TABLE deposit_holds CASCADE;` + `DROP FUNCTION get_withdrawable_balance;` + `DROP FUNCTION release_expired_holds;`
- **Deleted initiate route:** `git checkout HEAD -- src/app/api/withdrawal/initiate/route.ts`
- **deposit-processor.ts:** `git checkout HEAD -- src/lib/api/deposit-processor.ts`
- **withdrawal/transfer/route.ts:** `git checkout HEAD -- src/app/api/withdrawal/transfer/route.ts`
- **withdrawal-modal.tsx:** `git checkout HEAD -- src/components/withdrawal-modal.tsx`
- **New cron file + vercel.json entry:** Delete file + remove cron entry — no side effects
- **bcryptjs:** `bun remove bcryptjs` — only needed after removing the new route

---

## Open Questions

1. **Hold period for pre-existing deposits:** Users who deposited before this migration has no hold records. `get_withdrawable_balance()` returns their full balance — correct behavior, 3-day rule only applies to new deposits.
2. **Admin early-release of holds:** Not implemented. If needed: add admin API route that calls `UPDATE deposit_holds SET is_released=true WHERE id=$1`. Defer to separate feature.
3. **Customer-facing hold display:** The balance screen shows raw `profiles.balance`. Users may see a balance they can't fully withdraw. Consider adding a "₦X on hold" label to the dashboard. Defer to separate UI feature.
4. **Reseller/VIP daily limits:** All users share the same ₦200,000/3-withdrawal cap. Tiered limits via a `withdrawal_tier` column on profiles can be added later.
5. **Vercel cron plan limit:** Confirm whether project is on Hobby or Pro. If Hobby, consolidate `release-deposit-holds` with `vault-expiry` at `0 0 * * *` by adding the RPC call to the vault-expiry handler.
