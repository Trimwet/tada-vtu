-- Add virtual_accounts table for Flutterwave virtual account integration
-- Run this in Supabase SQL Editor

-- 1. Create virtual_accounts table
CREATE TABLE IF NOT EXISTS public.virtual_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT,
  order_ref TEXT NOT NULL,
  flw_ref TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_user_id ON public.virtual_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_account_number ON public.virtual_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_order_ref ON public.virtual_accounts(order_ref);

-- 3. Enable RLS
ALTER TABLE public.virtual_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view own virtual account" ON public.virtual_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Create trigger for updated_at
CREATE TRIGGER update_virtual_accounts_updated_at
  BEFORE UPDATE ON public.virtual_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Grant permissions
GRANT SELECT ON public.virtual_accounts TO authenticated;
