-- Create reseller_webhooks table for storing webhook configurations
-- This script assumes the profiles table exists with an id column
CREATE TABLE IF NOT EXISTS public.reseller_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT ARRAY['transaction.completed', 'transaction.failed'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reseller_webhooks ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy for users to manage their own webhooks
DROP POLICY IF EXISTS "Users can manage own webhooks" ON public.reseller_webhooks;
CREATE POLICY "Users can manage own webhooks" ON public.reseller_webhooks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reseller_webhooks_user_id ON public.reseller_webhooks(user_id);
