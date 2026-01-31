-- Create data_vault table for Phase 1: Simple park-and-deliver system
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
  delivery_reference TEXT, -- External reference from Inlomax
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_vault_user_id ON public.data_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_data_vault_status ON public.data_vault(status);
CREATE INDEX IF NOT EXISTS idx_data_vault_expires_at ON public.data_vault(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_vault_recipient_phone ON public.data_vault(recipient_phone);

-- Enable Row Level Security
ALTER TABLE public.data_vault ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own vault items" ON public.data_vault
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON public.data_vault
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON public.data_vault
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_data_vault_updated_at
  BEFORE UPDATE ON public.data_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create function to auto-refund expired vault items
CREATE OR REPLACE FUNCTION public.process_expired_vault_items()
RETURNS void AS $$
DECLARE
  expired_item RECORD;
BEGIN
  -- Find expired items that haven't been refunded
  FOR expired_item IN 
    SELECT id, user_id, amount, plan_name, recipient_phone, transaction_id
    FROM public.data_vault 
    WHERE status = 'ready' 
    AND expires_at < NOW()
  LOOP
    -- Update vault item status
    UPDATE public.data_vault 
    SET status = 'expired', updated_at = NOW()
    WHERE id = expired_item.id;
    
    -- Refund the user
    PERFORM public.update_user_balance(
      expired_item.user_id,
      expired_item.amount,
      'credit',
      'Data Vault Refund: ' || expired_item.plan_name || ' for ' || expired_item.recipient_phone,
      'VAULT_REFUND_' || expired_item.id::text
    );
    
    -- Update original transaction
    UPDATE public.transactions 
    SET status = 'refunded', updated_at = NOW()
    WHERE id = expired_item.transaction_id;
    
    -- Create notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      expired_item.user_id,
      'Data Vault Refund',
      'Your parked ' || expired_item.plan_name || ' for ' || expired_item.recipient_phone || ' has expired and been refunded.',
      'info'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint to prevent duplicate ready items for same user+phone+plan
CREATE UNIQUE INDEX idx_data_vault_unique_ready 
ON public.data_vault(user_id, recipient_phone, plan_id) 
WHERE status = 'ready';