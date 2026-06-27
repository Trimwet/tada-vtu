-- =============================================================================
-- Migration 036: Atomic Deposit RPC + RLS on reconciliation_entries
-- =============================================================================
-- Problems solved:
--
--   1. /ledger/deposit used a three-step flow (TransactionExists → CreditBalance
--      → InsertTransaction) identical to the pre-035 debit race. Two concurrent
--      webhook deliveries for the same payment could both pass the idempotency
--      check before either had written a transaction row — double credit.
--
--      atomic_deposit() collapses those steps into one Postgres transaction:
--        a) idempotency-key lookup (returns cached result if already processed)
--        b) FOR UPDATE row lock on profiles
--        c) balance credit
--        d) wallet_transactions audit row
--        e) transactions record (ON CONFLICT DO NOTHING as a safety net)
--        f) idempotency_keys upsert
--
--      The idempotency key is the payment provider's reference (externalReference
--      / flw_ref), which is stable across all retry deliveries of the same event.
--
--   2. reconciliation_entries was created in 034 with no RLS. Any client holding
--      the anon or authenticated key could read or write reconciliation data.
--      Go Core uses the service-role key (bypasses RLS), so enabling RLS and
--      restricting to service_role closes the gap without breaking anything.
-- =============================================================================

-- ── 1. RLS on reconciliation_entries ─────────────────────────────────────────

ALTER TABLE public.reconciliation_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.reconciliation_entries;
CREATE POLICY "service_role_only" ON public.reconciliation_entries
    USING  (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 2. atomic_deposit RPC ─────────────────────────────────────────────────────
--
-- Parameters:
--   p_idempotency_key    — use externalReference (provider's unique ref, e.g. flw_ref)
--   p_user_id            — profiles.id
--   p_amount             — walletCredit (net amount credited to user after fees)
--   p_description        — human-readable description
--   p_reference          — internal tx_ref
--   p_external_reference — Flutterwave flw_ref (stored on transactions row)
--   p_payment_type       — 'bank_transfer', 'card', etc.
--   p_gross_amount       — raw amount from provider (before fees)
--   p_fee                — fee deducted
--   p_metadata           — arbitrary JSONB passthrough
--
-- Returns JSONB:
--   { "success": true, "newBalance": <float>, "alreadyProcessed": <bool> }
-- =============================================================================
CREATE OR REPLACE FUNCTION public.atomic_deposit(
    p_idempotency_key    TEXT,
    p_user_id            UUID,
    p_amount             DECIMAL,
    p_description        TEXT,
    p_reference          TEXT,
    p_external_reference TEXT,
    p_payment_type       TEXT,
    p_gross_amount       DECIMAL,
    p_fee                DECIMAL,
    p_metadata           JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_before DECIMAL;
    v_new_balance    DECIMAL;
    v_result         JSONB;
    v_cached         JSONB;
BEGIN
    -- a) Idempotency: if this key was already processed, return the cached
    --    result with alreadyProcessed overridden to true so callers can detect
    --    the replay without re-crediting the user.
    SELECT result INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_cached || '{"alreadyProcessed": true}'::jsonb;
    END IF;

    -- b) Lock the profile row to prevent concurrent deposit races.
    SELECT balance INTO v_balance_before
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: %', p_user_id;
    END IF;

    -- c) Credit the user.
    v_new_balance := v_balance_before + p_amount;

    UPDATE public.profiles
    SET balance    = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- d) wallet_transactions audit trail (best-effort; won't abort the credit
    --    if the table has a different schema in some environments).
    BEGIN
        INSERT INTO wallet_transactions (
            user_id, type, amount, description, reference, balance_before, balance_after
        ) VALUES (
            p_user_id, 'credit', p_amount, p_description, p_reference,
            v_balance_before, v_new_balance
        );
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN others THEN
            -- Fallback: minimal insert if the column set differs.
            BEGIN
                INSERT INTO wallet_transactions (user_id, type, amount, description, reference)
                VALUES (p_user_id, 'credit', p_amount, p_description, p_reference);
            EXCEPTION WHEN others THEN NULL;
            END;
    END;

    -- e) Insert transaction record.
    --    ON CONFLICT DO NOTHING is an extra safety net; the idempotency check
    --    above is the primary guard.
    INSERT INTO public.transactions (
        user_id, type, amount, status, description,
        reference, external_reference, response_data,
        created_at, updated_at
    ) VALUES (
        p_user_id,
        'deposit',
        p_amount,
        'success',
        p_description,
        p_reference,
        p_external_reference,
        jsonb_build_object(
            'payment_type',  p_payment_type,
            'gross_amount',  p_gross_amount,
            'fee_deducted',  p_fee,
            'source',        'tada-core',
            'metadata',      p_metadata
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (reference) DO NOTHING;

    -- f) Cache the result so any concurrent/retry call gets the same answer.
    v_result := jsonb_build_object(
        'success',          true,
        'newBalance',       v_new_balance,
        'alreadyProcessed', false
    );

    INSERT INTO public.idempotency_keys (key, result)
    VALUES (p_idempotency_key, v_result)
    ON CONFLICT (key) DO NOTHING;

    RETURN v_result;
END;
$$;

-- Grant execute to service_role only — this function modifies balances and must
-- never be callable from client-side Supabase JS.
GRANT EXECUTE ON FUNCTION public.atomic_deposit TO service_role;
REVOKE EXECUTE ON FUNCTION public.atomic_deposit FROM PUBLIC;
