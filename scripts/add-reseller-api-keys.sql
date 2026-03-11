-- Migration: Add Reseller API Keys & Webhooks Table
-- Run this in Supabase SQL Editor to enable the reseller API feature

-- 1. Create Reseller API Keys Table
CREATE TABLE IF NOT EXISTS public.reseller_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  api_secret TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 60,
  monthly_limit DECIMAL(12,2) DEFAULT 100000.00,
  monthly_usage DECIMAL(12,2) DEFAULT 0.00,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 2. Create Webhooks Table
CREATE TABLE IF NOT EXISTS public.reseller_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['transaction.completed', 'transaction.failed'],
  is_active BOOLEAN DEFAULT true,
  secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_reseller_api_keys_user_id ON public.reseller_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_reseller_api_keys_key ON public.reseller_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_reseller_webhooks_user_id ON public.reseller_webhooks(user_id);

-- 4. Enable Row Level Security
ALTER TABLE public.reseller_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_webhooks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for API Keys
-- Users can view their own API keys
CREATE POLICY "Users can view own API keys" ON public.reseller_api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys" ON public.reseller_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys" ON public.reseller_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys" ON public.reseller_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to access all API keys (for validation)
CREATE POLICY "Service role can access all API keys" ON public.reseller_api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Create RLS Policies for Webhooks
-- Users can view their own webhooks
CREATE POLICY "Users can view own webhooks" ON public.reseller_webhooks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own webhooks
CREATE POLICY "Users can create own webhooks" ON public.reseller_webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own webhooks
CREATE POLICY "Users can update own webhooks" ON public.reseller_webhooks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own webhooks
CREATE POLICY "Users can delete own webhooks" ON public.reseller_webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Add a function to generate API credentials (optional helper)
CREATE OR REPLACE FUNCTION public.generate_reseller_api_credentials()
RETURNS TABLE(api_key TEXT, api_secret TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    'tada_live_' || substr(md5(random()::text), 1, 24) || substr(md5(random()::text), 1, 24) AS api_key,
    substr(md5(random()::text), 1, 32) AS api_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to create a new API key for a user
CREATE OR REPLACE FUNCTION public.create_reseller_api_key(
  p_user_id UUID,
  p_name TEXT DEFAULT 'Default Key'
)
RETURNS TABLE(id UUID, api_key TEXT, api_secret TEXT) AS $$
DECLARE
  v_api_key TEXT;
  v_api_secret TEXT;
  v_id UUID;
BEGIN
  -- Generate credentials
  SELECT api_key, api_secret INTO v_api_key, v_api_secret 
  FROM public.generate_reseller_api_credentials();
  
  -- Insert the new key
  INSERT INTO public.reseller_api_keys (user_id, api_key, api_secret, name)
  VALUES (p_user_id, v_api_key, v_api_secret, p_name)
  RETURNING id INTO v_id;
  
  RETURN QUERY SELECT v_id, v_api_key, v_api_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to increment API key usage
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(
  p_api_key_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.reseller_api_keys
  SET monthly_usage = COALESCE(monthly_usage, 0) + p_amount
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Now users can generate API keys from your dashboard
