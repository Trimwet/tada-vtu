-- Comprehensive cleanup of gift system tables and functions
-- This migration removes all gift-related database objects

-- First, let's check what transaction types are allowed
-- We need to add 'other' to the enum if it doesn't exist, or use an existing valid type

-- Update gift-related transactions to use 'data' type instead of 'other'
-- This is safer as 'data' is definitely in the existing enum
UPDATE public.transactions 
SET type = 'data',
    description = CASE 
      WHEN description LIKE '%Gift%' THEN REPLACE(description, 'Gift', 'Data')
      ELSE description
    END
WHERE type IN ('gift', 'gift_refund', 'gift_claim');

-- Drop gift-related tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS public.gift_claims CASCADE;
DROP TABLE IF EXISTS public.gift_room_activities CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.gift_rooms CASCADE;
DROP TABLE IF EXISTS public.gifts CASCADE;

-- Drop gift-related functions
DROP FUNCTION IF EXISTS public.cleanup_expired_gift_rooms() CASCADE;
DROP FUNCTION IF EXISTS public.validate_gift_room_ownership(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.refund_gift_room(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_gift_room(UUID, TEXT, INTEGER, DECIMAL, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.claim_gift(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generate_gift_room_token() CASCADE;

-- Drop gift-related indexes (if they still exist)
DROP INDEX IF EXISTS idx_gift_rooms_sender_id;
DROP INDEX IF EXISTS idx_gift_rooms_status;
DROP INDEX IF EXISTS idx_gift_rooms_expires_at;
DROP INDEX IF EXISTS idx_gift_rooms_token;
DROP INDEX IF EXISTS idx_reservations_room_id;
DROP INDEX IF EXISTS idx_reservations_user_id;
DROP INDEX IF EXISTS idx_reservations_status;
DROP INDEX IF EXISTS idx_gift_claims_user_id;
DROP INDEX IF EXISTS idx_gift_room_activities_room_id;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Gift system completely removed - focusing on Data Vault with QR codes';

-- Log the cleanup
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'gift_system_removed', 
  'true', 
  'Gift room and gift card system removed in favor of Data Vault with QR codes'
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();