-- =============================================================================
-- Migration 040: Fix atomic_refund wallet_transactions balance tracking
-- =============================================================================
-- Problem:
--   The atomic_refund RPC inserted wallet_transactions rows without
--   balance_before / balance_after, but the table has NOT NULL constraints
--   on those columns. This caused every programmatic refund to fail with:
--     "null value in column 'balance_before' violates not-null constraint"
--
--   Impact: When a Flutterwave transfer failed, the webhook called
--   coreRefund → atomic_refund, which threw a 400 error. The webhook's
--   catch block silently swallowed the failure, so the user's money
--   was deducted but never refunded.
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
    v_current_balance DECIMAL;
    v_new_balance     DECIMAL;
    v_result          JSONB;
    v_cached          JSONB;
BEGIN
    -- Idempotency check
    SELECT result INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_cached;
    END IF;

    -- Get current balance WITH row lock (prevents concurrent races)
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: %', p_user_id;
    END IF;

    -- Credit the user
    v_new_balance := v_current_balance + p_amount;

    UPDATE public.profiles
    SET balance    = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- wallet_transactions audit (now includes balance_before / balance_after)
    BEGIN
        INSERT INTO wallet_transactions (user_id, type, amount, description, reference, balance_before, balance_after)
        VALUES (p_user_id, 'credit', p_amount, p_description, p_reference, v_current_balance, v_new_balance);
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
