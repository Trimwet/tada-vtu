-- Migration: Add metadata column to transactions table
-- This fixes the "column 'metadata' does not exist" error

-- Add metadata column to store additional transaction data
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index for metadata queries (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON public.transactions USING GIN (metadata);

-- Grant necessary permissions
GRANT UPDATE ON public.transactions TO service_role;