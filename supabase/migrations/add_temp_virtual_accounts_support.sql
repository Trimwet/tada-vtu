-- Migration: Add support for temporary virtual accounts
-- This allows users to have multiple temporary accounts for different transactions
-- Run this in Supabase SQL Editor

-- 1. Remove the UNIQUE constraint on user_id to allow multiple temp accounts
ALTER TABLE public.virtual_accounts DROP CONSTRAINT IF EXISTS virtual_accounts_user_id_key;

-- 2. Add new columns for temporary account support
ALTER TABLE public.virtual_accounts 
ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Create index for finding accounts by flw_ref (for webhook lookup)
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_flw_ref ON public.virtual_accounts(flw_ref);

-- 4. Create index for cleanup of expired temporary accounts
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_expires_at ON public.virtual_accounts(expires_at) WHERE is_temporary = true;

-- 5. Add a unique constraint only for permanent accounts (one per user)
-- This is done via a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_accounts_permanent_per_user 
ON public.virtual_accounts(user_id) 
WHERE is_temporary = false;

-- 6. Grant service role ability to insert (for webhook)
GRANT INSERT, UPDATE ON public.virtual_accounts TO service_role;
