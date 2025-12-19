-- Fix gift_cards table - Add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add recipient_email if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'recipient_email') THEN
    ALTER TABLE public.gift_cards ADD COLUMN recipient_email TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add recipient_phone if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'recipient_phone') THEN
    ALTER TABLE public.gift_cards ADD COLUMN recipient_phone TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add sender_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'sender_name') THEN
    ALTER TABLE public.gift_cards ADD COLUMN sender_name TEXT NOT NULL DEFAULT 'Someone special';
  END IF;

  -- Add recipient_user_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'recipient_user_id') THEN
    ALTER TABLE public.gift_cards ADD COLUMN recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add service_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'service_type') THEN
    ALTER TABLE public.gift_cards ADD COLUMN service_type TEXT NOT NULL DEFAULT 'airtime';
  END IF;

  -- Add amount if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'amount') THEN
    ALTER TABLE public.gift_cards ADD COLUMN amount DECIMAL(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add network if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'network') THEN
    ALTER TABLE public.gift_cards ADD COLUMN network TEXT;
  END IF;

  -- Add occasion if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'occasion') THEN
    ALTER TABLE public.gift_cards ADD COLUMN occasion TEXT NOT NULL DEFAULT 'custom';
  END IF;

  -- Add theme_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'theme_id') THEN
    ALTER TABLE public.gift_cards ADD COLUMN theme_id TEXT NOT NULL DEFAULT 'default';
  END IF;

  -- Add personal_message if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'personal_message') THEN
    ALTER TABLE public.gift_cards ADD COLUMN personal_message TEXT;
  END IF;

  -- Add scheduled_delivery if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'scheduled_delivery') THEN
    ALTER TABLE public.gift_cards ADD COLUMN scheduled_delivery TIMESTAMPTZ;
  END IF;

  -- Add delivered_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'delivered_at') THEN
    ALTER TABLE public.gift_cards ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;

  -- Add opened_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'opened_at') THEN
    ALTER TABLE public.gift_cards ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;

  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.gift_cards ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  -- Add expires_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'expires_at') THEN
    ALTER TABLE public.gift_cards ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
  END IF;

  -- Add sender_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'sender_id') THEN
    ALTER TABLE public.gift_cards ADD COLUMN sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE public.gift_cards ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_cards' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.gift_cards ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_gift_cards_sender ON public.gift_cards(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON public.gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_user ON public.gift_cards(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON public.gift_cards(status);

-- Enable RLS if not already enabled
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view sent gifts" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can view received gifts" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can send gifts" ON public.gift_cards;
DROP POLICY IF EXISTS "Recipients can open gifts" ON public.gift_cards;
DROP POLICY IF EXISTS "Service role full access" ON public.gift_cards;

-- Create policies
CREATE POLICY "Users can view sent gifts" ON public.gift_cards
  FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can view received gifts" ON public.gift_cards
  FOR SELECT USING (auth.uid() = recipient_user_id OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can send gifts" ON public.gift_cards
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can open gifts" ON public.gift_cards
  FOR UPDATE USING (auth.uid() = recipient_user_id OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access" ON public.gift_cards
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
