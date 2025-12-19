-- Gift Cards & Birthday Bonuses Migration
-- Run this in Supabase SQL Editor

-- 1. Create gift_cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT NOT NULL, -- Phone number for airtime delivery
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Gift details
  service_type TEXT NOT NULL CHECK (service_type IN ('airtime', 'data')),
  amount DECIMAL(12,2) NOT NULL,
  network TEXT, -- For data gifts
  data_plan_id TEXT, -- For data gifts
  
  -- Emotional layer
  occasion TEXT NOT NULL CHECK (occasion IN ('birthday', 'anniversary', 'thanks', 'love', 'apology', 'ramadan', 'christmas', 'eid', 'graduation', 'custom')),
  theme_id TEXT NOT NULL DEFAULT 'default',
  personal_message TEXT,
  voice_note_url TEXT,
  
  -- Delivery
  scheduled_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'delivered', 'opened', 'credited', 'expired', 'cancelled')),
  
  -- Transaction tracking
  transaction_id UUID REFERENCES public.transactions(id),
  inlomax_reference TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 2. Create birthday_bonuses table to track sent bonuses
CREATE TABLE IF NOT EXISTS public.birthday_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tier TEXT NOT NULL,
  credited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_sender ON public.gift_cards(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON public.gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_user ON public.gift_cards(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON public.gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_scheduled ON public.gift_cards(scheduled_delivery) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_birthday_bonuses_user ON public.birthday_bonuses(user_id);

-- 4. Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_bonuses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for gift_cards

-- Senders can view their sent gifts
CREATE POLICY "Users can view sent gifts" ON public.gift_cards
  FOR SELECT USING (auth.uid() = sender_id);

-- Recipients can view gifts sent to them
CREATE POLICY "Users can view received gifts" ON public.gift_cards
  FOR SELECT USING (auth.uid() = recipient_user_id);

-- Users can create gifts (sender)
CREATE POLICY "Users can send gifts" ON public.gift_cards
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Recipients can update gift status (open)
CREATE POLICY "Recipients can open gifts" ON public.gift_cards
  FOR UPDATE USING (auth.uid() = recipient_user_id);

-- 6. RLS Policies for birthday_bonuses
CREATE POLICY "Users can view own birthday bonuses" ON public.birthday_bonuses
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Function to process gift card opening
CREATE OR REPLACE FUNCTION public.open_gift_card(p_gift_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_gift RECORD;
  v_result JSONB;
BEGIN
  -- Get gift details
  SELECT * INTO v_gift
  FROM public.gift_cards
  WHERE id = p_gift_id
  FOR UPDATE;
  
  -- Validate gift exists
  IF v_gift IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  -- Check if already opened
  IF v_gift.status IN ('opened', 'credited') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift already opened');
  END IF;
  
  -- Check if expired
  IF v_gift.expires_at < NOW() THEN
    UPDATE public.gift_cards SET status = 'expired' WHERE id = p_gift_id;
    RETURN jsonb_build_object('success', false, 'error', 'Gift has expired');
  END IF;
  
  -- Mark as opened
  UPDATE public.gift_cards
  SET 
    status = 'opened',
    opened_at = NOW(),
    recipient_user_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_gift_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'gift', jsonb_build_object(
      'id', v_gift.id,
      'sender_name', v_gift.sender_name,
      'amount', v_gift.amount,
      'service_type', v_gift.service_type,
      'occasion', v_gift.occasion,
      'theme_id', v_gift.theme_id,
      'personal_message', v_gift.personal_message,
      'voice_note_url', v_gift.voice_note_url
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to credit birthday bonus
CREATE OR REPLACE FUNCTION public.credit_birthday_bonus(
  p_user_id UUID,
  p_amount DECIMAL,
  p_tier TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
  v_existing RECORD;
BEGIN
  -- Check if already credited this year
  SELECT * INTO v_existing
  FROM public.birthday_bonuses
  WHERE user_id = p_user_id AND year = v_year;
  
  IF v_existing IS NOT NULL THEN
    RETURN false; -- Already credited
  END IF;
  
  -- Credit the bonus
  PERFORM public.update_user_balance(
    p_user_id,
    p_amount,
    'credit',
    'Birthday Bonus 🎂',
    'BDAY_' || v_year || '_' || p_user_id
  );
  
  -- Record the bonus
  INSERT INTO public.birthday_bonuses (user_id, year, amount, tier)
  VALUES (p_user_id, v_year, p_amount, p_tier);
  
  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '🎂 Happy Birthday!',
    'We''ve added ₦' || p_amount || ' to your wallet as a birthday gift! Enjoy your special day!',
    'success'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update trigger for gift_cards
CREATE TRIGGER update_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
