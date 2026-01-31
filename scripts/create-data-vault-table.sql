-- Quick setup for data_vault table
-- Run this in Supabase SQL Editor

-- Create data_vault table
CREATE TABLE IF NOT EXISTS public.data_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  recipient_phone TEXT NOT NULL,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'delivered', 'expired', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  transaction_id UUID REFERENCES public.transactions(id),
  delivery_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_vault_user_id ON public.data_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_data_vault_status ON public.data_vault(status);
CREATE INDEX IF NOT EXISTS idx_data_vault_expires_at ON public.data_vault(expires_at);

-- Enable RLS
ALTER TABLE public.data_vault ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own vault items" ON public.data_vault
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON public.data_vault
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON public.data_vault
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at (if update_updated_at function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER update_data_vault_updated_at
      BEFORE UPDATE ON public.data_vault
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_vault_unique_ready 
ON public.data_vault(user_id, recipient_phone, plan_id) 
WHERE status = 'ready';