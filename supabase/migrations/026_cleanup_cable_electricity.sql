-- Remove cable TV and electricity features - focusing on core mobile services
-- This migration cleans up cable and electricity references

-- Update transaction types to remove cable and electricity
-- Convert existing cable/electricity transactions to 'data' type
UPDATE public.transactions 
SET type = 'data',
    description = CASE 
      WHEN type = 'cable' THEN REPLACE(description, 'Cable', 'Data')
      WHEN type = 'electricity' THEN REPLACE(description, 'Electricity', 'Data')
      ELSE description
    END
WHERE type IN ('cable', 'electricity');

-- Update scheduled purchases to remove cable/electricity (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_purchases') THEN
    UPDATE public.scheduled_purchases 
    SET service_type = 'data'
    WHERE service_type IN ('cable', 'electricity');
  END IF;
END $$;

-- Update user spending patterns to consolidate cable/electricity into data (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_spending_patterns') THEN
    UPDATE public.user_spending_patterns 
    SET data_spent = data_spent + cable_spent + electricity_spent,
        cable_spent = 0,
        electricity_spent = 0
    WHERE cable_spent > 0 OR electricity_spent > 0;
  END IF;
END $$;

-- Log the cleanup
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'cable_electricity_removed', 
  'true', 
  'Cable TV and Electricity features removed - focusing on core mobile services (Airtime, Data)'
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();