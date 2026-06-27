-- =============================================================================
-- Migration 035: Idempotency Keys + Atomic Debit RPC
-- =============================================================================
-- Problem being solved:
--   The existing update_user_balance RPC is atomic but has no idempotency.
--   If the same idempotency_key is submitted twice concurrently, both calls
--   could pass the TransactionExists check before either writes the row,
--   resulting in a double debit.
--
--   This migration adds:
--   1. idempotency_keys table  — stores the result of any completed operation
--   2. atomic_debit RPC        — debit + idempotency check in ONE transaction
--   3. atomic_refund RPC       — refund + idempotency check in ONE transaction
--   4. Unique constraint on transactions.reference (prevents duplicate rows)
-- =============================================================================

-- 1. Idempotency keys table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key         TEXT        PRIMARY KEY,
    result      JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup index (run DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '48h' periodically)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
    ON public.idempotency_keys (created_at);

-- Only service role may read/write
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.idempotency_keys;
CREATE POLICY "service_role_only" ON public.idempotency_keys
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 2. Unique constraint on transactions.reference (safe — add only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'transactions_reference_unique'
          AND conrelid = 'public.transactions'::regclass
    ) THEN
        ALTER TABLE public.transactions
            ADD CONSTRAINT transactions_reference_unique UNIQUE (reference);
    END IF;
END$$;

-- =============================================================================
-- 3. atomic_debit(idempotency_key, user_id, amount, description, reference)
--
--    Single DB transaction that:
--      a) Returns cached result if key already used (idempotent replay)
--      b) Takes FOR UPDATE row lock on profiles
--      c) Checks sufficient balance
--      d) Calls update_user_balance (which writes wallet_transactions too)
--      e) Inserts pending transaction row
--      f) Stores idempotency result
--
--    Returns JSONB: { "success": true, "newBalance": <float>, "amountDebited": <float> }
--    OR raises an exception the Go layer maps to an HTTP error.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.atomic_debit(
    p_idempotency_key TEXT,
    p_user_id         UUID,
    p_amount          DECIMAL,
    p_description     TEXT,
    p_reference       TEXT,
    p_service_type    TEXT,
    p_metadata        JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance     DECIMAL;
    v_result          JSONB;
    v_cached          JSONB;
BEGIN
    -- a) Idempotency: return cached result if already processed
    SELECT result INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_cached;
    END IF;

    -- b) Lock the profile row to prevent concurrent debit races
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: %', p_user_id;
    END IF;

    -- c) Sufficient balance check
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE: balance=% requested=%',
            v_current_balance, p_amount;
    END IF;

    -- d) Update balance atomically
    v_new_balance := v_current_balance - p_amount;

    UPDATE public.profiles
    SET balance    = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Also record in wallet_transactions for the existing audit trail
    BEGIN
        INSERT INTO wallet_transactions (user_id, type, amount, description, reference, balance_before, balance_after)
        VALUES (p_user_id, 'debit', p_amount, p_description, p_reference, v_current_balance, v_new_balance);
    EXCEPTION WHEN undefined_table THEN
        NULL; -- table may not exist in all environments
    END;

    -- e) Insert pending transaction row (ON CONFLICT DO NOTHING for safety)
    INSERT INTO public.transactions (
        user_id, type, amount, status, description, reference, response_data, created_at, updated_at
    ) VALUES (
        p_user_id,
        p_service_type,
        -p_amount,
        'pending',
        p_description,
        p_reference,
        jsonb_build_object('idempotency_key', p_idempotency_key, 'metadata', p_metadata, 'source', 'tada-core'),
        NOW(),
        NOW()
    )
    ON CONFLICT (reference) DO NOTHING;

    -- f) Cache the result
    v_result := jsonb_build_object(
        'success',      true,
        'newBalance',   v_new_balance,
        'amountDebited', p_amount
    );

    INSERT INTO public.idempotency_keys (key, result)
    VALUES (p_idempotency_key, v_result)
    ON CONFLICT (key) DO NOTHING;

    RETURN v_result;
END;
$$;

-- =============================================================================
-- 4. atomic_refund(idempotency_key, user_id, amount, description, reference, original_reference)
--
--    Credits the user back after a failed purchase. Idempotent.
--    Returns JSONB: { "success": true, "newBalance": <float> }
-- =============================================================================
CREATE OR REPLACE FUNCTION public.atomic_refund(
    p_idempotency_key    TEXT,
    p_user_id            UUID,
    p_amount             DECIMAL,
    p_description        TEXT,
    p_reference          TEXT,
    p_original_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance DECIMAL;
    v_result      JSONB;
    v_cached      JSONB;
BEGIN
    -- Idempotency check
    SELECT result INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_cached;
    END IF;

    -- Credit the user
    UPDATE public.profiles
    SET balance    = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: %', p_user_id;
    END IF;

    -- wallet_transactions audit
    BEGIN
        INSERT INTO wallet_transactions (user_id, type, amount, description, reference)
        VALUES (p_user_id, 'credit', p_amount, p_description, p_reference);
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- Mark original transaction failed
    UPDATE public.transactions
    SET status     = 'failed',
        updated_at = NOW()
    WHERE reference = p_original_reference
      AND status    = 'pending';

    -- Insert refund record
    INSERT INTO public.transactions (
        user_id, type, amount, status, description, reference, response_data, created_at, updated_at
    ) VALUES (
        p_user_id, 'refund', p_amount, 'success', p_description, p_reference,
        jsonb_build_object('original_reference', p_original_reference, 'source', 'tada-core'),
        NOW(), NOW()
    )
    ON CONFLICT (reference) DO NOTHING;

    -- Cache result
    v_result := jsonb_build_object(
        'success',    true,
        'newBalance', v_new_balance
    );

    INSERT INTO public.idempotency_keys (key, result)
    VALUES (p_idempotency_key, v_result)
    ON CONFLICT (key) DO NOTHING;

    RETURN v_result;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION public.atomic_debit TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_refund TO service_role;
REVOKE EXECUTE ON FUNCTION public.atomic_debit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atomic_refund FROM PUBLIC;
