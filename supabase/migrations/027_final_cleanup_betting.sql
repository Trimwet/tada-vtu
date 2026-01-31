-- Final cleanup: Remove betting feature - TADA VTU now focuses purely on mobile services
-- This migration removes betting references and finalizes the streamlined platform

-- Update transaction types to remove betting
-- Convert existing betting transactions to 'data' type
UPDATE public.transactions 
SET type = 'data',
    description = CASE 
      WHEN type = 'betting' THEN REPLACE(description, 'Betting', 'Data')
      ELSE description
    END
WHERE type = 'betting';

-- Update scheduled purchases to remove betting (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_purchases') THEN
    UPDATE public.scheduled_purchases 
    SET service_type = 'data'
    WHERE service_type = 'betting';
  END IF;
END $$;

-- Update user spending patterns (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_spending_patterns') THEN
    -- No specific updates needed for betting removal
    NULL;
  END IF;
END $$;

-- Update transaction type constraints to only allow core mobile services
-- First drop the old constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add new constraint with only core services
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'airtime', 'data', 'withdrawal'));

-- Update scheduled purchases constraint (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_purchases') THEN
    ALTER TABLE public.scheduled_purchases DROP CONSTRAINT IF EXISTS scheduled_purchases_service_type_check;
    ALTER TABLE public.scheduled_purchases ADD CONSTRAINT scheduled_purchases_service_type_check 
    CHECK (service_type IN ('airtime', 'data'));
  END IF;
END $$;

-- Log the final cleanup
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'platform_streamlined', 
  'true', 
  'TADA VTU streamlined to focus on core mobile services: Airtime, Data, and Data Vault with QR codes'
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add final comment
COMMENT ON SCHEMA public IS 'TADA VTU - Streamlined mobile services platform focused on Airtime, Data, and innovative Data Vault with QR codes';