-- Migration: Add 'crediting' status for better transaction integrity
-- This intermediate state prevents double-credit issues during VTU API calls

-- Add crediting status to the enum (if using enum) or update check constraint
-- Since we're using text type, we just need to document the new status

-- Add index for faster cron job queries on status
CREATE INDEX IF NOT EXISTS idx_gift_cards_status_expires 
ON gift_cards(status, expires_at) 
WHERE status IN ('delivered', 'opened', 'crediting');

-- Add index for retry processing
CREATE INDEX IF NOT EXISTS idx_gift_cards_retry 
ON gift_cards(status, retry_count, last_error) 
WHERE status = 'opened' AND retry_count > 0;

-- Add idempotency key column for open requests
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS open_idempotency_key TEXT;

-- Add unique constraint on idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_cards_idempotency 
ON gift_cards(open_idempotency_key) 
WHERE open_idempotency_key IS NOT NULL;

-- Add crediting_started_at for timeout detection
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS crediting_started_at TIMESTAMPTZ;

-- Comment on new columns
COMMENT ON COLUMN gift_cards.open_idempotency_key IS 'Unique key to prevent duplicate open requests';
COMMENT ON COLUMN gift_cards.crediting_started_at IS 'Timestamp when crediting process started, used for timeout detection';

-- Function to safely transition to crediting status (atomic)
CREATE OR REPLACE FUNCTION start_gift_crediting(
  p_gift_id UUID,
  p_idempotency_key TEXT
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  gift_status TEXT
) AS $$
DECLARE
  v_current_status TEXT;
  v_existing_key TEXT;
BEGIN
  -- Lock the row for update
  SELECT status, open_idempotency_key 
  INTO v_current_status, v_existing_key
  FROM gift_cards 
  WHERE id = p_gift_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Gift not found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Already credited - idempotent success
  IF v_current_status = 'credited' THEN
    RETURN QUERY SELECT true, 'Already credited'::TEXT, 'credited'::TEXT;
    RETURN;
  END IF;
  
  -- Check if same idempotency key (retry of same request)
  IF v_existing_key = p_idempotency_key THEN
    RETURN QUERY SELECT true, 'Processing in progress'::TEXT, v_current_status;
    RETURN;
  END IF;
  
  -- Only allow transition from delivered or opened
  IF v_current_status NOT IN ('delivered', 'opened') THEN
    RETURN QUERY SELECT false, 'Invalid status for crediting: ' || v_current_status, v_current_status;
    RETURN;
  END IF;
  
  -- Transition to crediting
  UPDATE gift_cards 
  SET 
    status = 'crediting',
    open_idempotency_key = p_idempotency_key,
    crediting_started_at = NOW()
  WHERE id = p_gift_id;
  
  RETURN QUERY SELECT true, 'Crediting started'::TEXT, 'crediting'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to complete crediting (success)
CREATE OR REPLACE FUNCTION complete_gift_crediting(
  p_gift_id UUID,
  p_inlomax_reference TEXT,
  p_transaction_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE gift_cards 
  SET 
    status = 'credited',
    inlomax_reference = p_inlomax_reference,
    transaction_id = p_transaction_id,
    last_error = NULL
  WHERE id = p_gift_id 
    AND status = 'crediting';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to fail crediting (with retry support)
CREATE OR REPLACE FUNCTION fail_gift_crediting(
  p_gift_id UUID,
  p_error_message TEXT
) RETURNS TABLE(
  can_retry BOOLEAN,
  remaining_retries INTEGER
) AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER := 3;
BEGIN
  SELECT retry_count INTO v_retry_count
  FROM gift_cards WHERE id = p_gift_id;
  
  UPDATE gift_cards 
  SET 
    status = 'opened',
    retry_count = COALESCE(retry_count, 0) + 1,
    last_error = p_error_message,
    open_idempotency_key = NULL,
    crediting_started_at = NULL
  WHERE id = p_gift_id;
  
  RETURN QUERY SELECT 
    (COALESCE(v_retry_count, 0) + 1) < v_max_retries,
    v_max_retries - (COALESCE(v_retry_count, 0) + 1);
END;
$$ LANGUAGE plpgsql;

-- Cron helper: Reset stuck crediting gifts (timeout after 5 minutes)
CREATE OR REPLACE FUNCTION reset_stuck_crediting_gifts() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE gift_cards 
  SET 
    status = 'opened',
    last_error = 'Crediting timeout - please retry',
    open_idempotency_key = NULL,
    crediting_started_at = NULL
  WHERE status = 'crediting' 
    AND crediting_started_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
