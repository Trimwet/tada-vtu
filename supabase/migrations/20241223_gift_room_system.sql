-- Gift Room System Database Migration
-- Add gift room functionality to TADA VTU

-- 1. Create gift_rooms table
CREATE TABLE IF NOT EXISTS public.gift_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'group', 'public')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  message TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'expired', 'completed')),
  joined_count INTEGER DEFAULT 0 CHECK (joined_count >= 0),
  claimed_count INTEGER DEFAULT 0 CHECK (claimed_count >= 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_capacity_limits CHECK (
    (type = 'personal' AND capacity = 1) OR
    (type = 'group' AND capacity BETWEEN 2 AND 50) OR
    (type = 'public' AND capacity <= 1000)
  ),
  CONSTRAINT check_total_amount CHECK (total_amount = capacity * amount),
  CONSTRAINT check_counts CHECK (claimed_count <= joined_count AND joined_count <= capacity)
);

-- 2. Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.gift_rooms(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  temp_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
  contact_info JSONB,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  
  -- Unique constraint: one reservation per device per room
  UNIQUE(room_id, device_fingerprint)
);

-- 3. Create gift_claims table
CREATE TABLE IF NOT EXISTS public.gift_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  transaction_id UUID REFERENCES public.wallet_transactions(id),
  referral_bonus_awarded BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one claim per reservation
  UNIQUE(reservation_id)
);

-- 4. Create gift_room_activities table for audit logging
CREATE TABLE IF NOT EXISTS public.gift_room_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.gift_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'joined', 'claimed', 'expired', 'refunded')),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_rooms_sender_id ON public.gift_rooms(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_token ON public.gift_rooms(token);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_status ON public.gift_rooms(status);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_expires_at ON public.gift_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_created_at ON public.gift_rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_device_fingerprint ON public.reservations(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reservations_temp_token ON public.reservations(temp_token);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);

CREATE INDEX IF NOT EXISTS idx_gift_claims_user_id ON public.gift_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_claims_claimed_at ON public.gift_claims(claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_gift_room_activities_room_id ON public.gift_room_activities(room_id);
CREATE INDEX IF NOT EXISTS idx_gift_room_activities_user_id ON public.gift_room_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_room_activities_type ON public.gift_room_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_gift_room_activities_created_at ON public.gift_room_activities(created_at DESC);

-- 6. Enable Row Level Security
ALTER TABLE public.gift_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_room_activities ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies

-- Gift rooms policies
CREATE POLICY "Users can view gift rooms they created" ON public.gift_rooms
  FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can create gift rooms" ON public.gift_rooms
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update gift rooms they created" ON public.gift_rooms
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Anyone can view active gift rooms by token" ON public.gift_rooms
  FOR SELECT USING (status = 'active');

-- Reservations policies
CREATE POLICY "Users can view their own reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create reservations" ON public.reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- Gift claims policies
CREATE POLICY "Users can view their own claims" ON public.gift_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims for their reservations" ON public.gift_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity logs policies (read-only for users)
CREATE POLICY "Users can view activities for their rooms" ON public.gift_room_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gift_rooms 
      WHERE id = room_id AND sender_id = auth.uid()
    )
  );

-- 8. Create functions for gift room operations

-- Function to generate secure gift room token
CREATE OR REPLACE FUNCTION public.generate_gift_room_token()
RETURNS TEXT AS $
DECLARE
  token TEXT;
BEGIN
  -- Generate a cryptographically secure token
  token := encode(gen_random_bytes(32), 'base64');
  -- Make it URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate temp reservation token
CREATE OR REPLACE FUNCTION public.generate_temp_token()
RETURNS TEXT AS $
DECLARE
  token TEXT;
BEGIN
  -- Generate a shorter temp token
  token := encode(gen_random_bytes(16), 'base64');
  -- Make it URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create gift room with validation
CREATE OR REPLACE FUNCTION public.create_gift_room(
  p_sender_id UUID,
  p_type TEXT,
  p_capacity INTEGER,
  p_amount DECIMAL,
  p_message TEXT DEFAULT NULL,
  p_expiration_hours INTEGER DEFAULT 48
)
RETURNS UUID AS $
DECLARE
  v_room_id UUID;
  v_token TEXT;
  v_total_amount DECIMAL;
  v_expires_at TIMESTAMPTZ;
  v_sender_balance DECIMAL;
BEGIN
  -- Validate gift type and capacity
  IF p_type = 'personal' AND p_capacity != 1 THEN
    RAISE EXCEPTION 'Personal gifts must have capacity of 1';
  END IF;
  
  IF p_type = 'group' AND (p_capacity < 2 OR p_capacity > 50) THEN
    RAISE EXCEPTION 'Group gifts must have capacity between 2 and 50';
  END IF;
  
  IF p_type = 'public' AND p_capacity > 1000 THEN
    RAISE EXCEPTION 'Public giveaways cannot exceed 1000 capacity';
  END IF;

  -- Calculate total amount
  v_total_amount := p_capacity * p_amount;
  
  -- Check sender balance
  SELECT balance INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id;
  
  IF v_sender_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Required: ₦%, Available: ₦%', v_total_amount, v_sender_balance;
  END IF;

  -- Generate unique token
  LOOP
    v_token := public.generate_gift_room_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_rooms WHERE token = v_token);
  END LOOP;

  -- Calculate expiration
  v_expires_at := NOW() + (p_expiration_hours || ' hours')::INTERVAL;

  -- Create gift room
  INSERT INTO public.gift_rooms (
    sender_id, type, capacity, amount, total_amount, message, token, expires_at
  ) VALUES (
    p_sender_id, p_type, p_capacity, p_amount, v_total_amount, p_message, v_token, v_expires_at
  ) RETURNING id INTO v_room_id;

  -- Deduct amount from sender's wallet
  PERFORM public.update_user_balance(
    p_sender_id,
    v_total_amount,
    'debit',
    'Gift room created: ' || p_type || ' gift for ' || p_capacity || ' recipients',
    'gift_room_' || v_room_id
  );

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, user_id, activity_type, details)
  VALUES (v_room_id, p_sender_id, 'created', jsonb_build_object(
    'type', p_type,
    'capacity', p_capacity,
    'amount', p_amount,
    'total_amount', v_total_amount
  ));

  RETURN v_room_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create reservation
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_room_id UUID,
  p_device_fingerprint TEXT,
  p_contact_info JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  v_reservation_id UUID;
  v_temp_token TEXT;
  v_room_capacity INTEGER;
  v_room_joined_count INTEGER;
  v_room_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_room_type TEXT;
BEGIN
  -- Get room details
  SELECT capacity, joined_count, status, type
  INTO v_room_capacity, v_room_joined_count, v_room_status, v_room_type
  FROM public.gift_rooms
  WHERE id = p_room_id;

  -- Check if room exists and is active
  IF v_room_status IS NULL THEN
    RAISE EXCEPTION 'Gift room not found';
  END IF;

  IF v_room_status != 'active' THEN
    RAISE EXCEPTION 'Gift room is no longer active';
  END IF;

  -- Check capacity
  IF v_room_joined_count >= v_room_capacity THEN
    RAISE EXCEPTION 'Gift room is full';
  END IF;

  -- Check for existing reservation
  IF EXISTS (SELECT 1 FROM public.reservations WHERE room_id = p_room_id AND device_fingerprint = p_device_fingerprint) THEN
    RAISE EXCEPTION 'Device already has a reservation in this room';
  END IF;

  -- Generate unique temp token
  LOOP
    v_temp_token := public.generate_temp_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE temp_token = v_temp_token);
  END LOOP;

  -- Set expiration based on room type
  IF v_room_type = 'public' THEN
    v_expires_at := NOW() + INTERVAL '6 hours';
  ELSE
    v_expires_at := NOW() + INTERVAL '48 hours';
  END IF;

  -- Create reservation
  INSERT INTO public.reservations (
    room_id, device_fingerprint, temp_token, contact_info, expires_at
  ) VALUES (
    p_room_id, p_device_fingerprint, v_temp_token, p_contact_info, v_expires_at
  ) RETURNING id INTO v_reservation_id;

  -- Update room joined count
  UPDATE public.gift_rooms
  SET joined_count = joined_count + 1,
      status = CASE WHEN joined_count + 1 >= capacity THEN 'full' ELSE 'active' END,
      updated_at = NOW()
  WHERE id = p_room_id;

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, activity_type, details)
  VALUES (p_room_id, 'joined', jsonb_build_object(
    'reservation_id', v_reservation_id,
    'device_fingerprint', p_device_fingerprint
  ));

  RETURN v_reservation_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim gift
CREATE OR REPLACE FUNCTION public.claim_gift(
  p_reservation_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $
DECLARE
  v_claim_id UUID;
  v_room_id UUID;
  v_sender_id UUID;
  v_amount DECIMAL;
  v_reservation_status TEXT;
  v_is_new_user BOOLEAN;
  v_wallet_transaction_id UUID;
BEGIN
  -- Get reservation details
  SELECT r.room_id, r.status, gr.sender_id, gr.amount
  INTO v_room_id, v_reservation_status, v_sender_id, v_amount
  FROM public.reservations r
  JOIN public.gift_rooms gr ON r.room_id = gr.id
  WHERE r.id = p_reservation_id;

  -- Validate reservation
  IF v_reservation_status IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_reservation_status != 'active' THEN
    RAISE EXCEPTION 'Reservation is no longer active';
  END IF;

  -- Check if already claimed
  IF EXISTS (SELECT 1 FROM public.gift_claims WHERE reservation_id = p_reservation_id) THEN
    RAISE EXCEPTION 'Gift already claimed';
  END IF;

  -- Check if user is new (for referral bonus)
  SELECT (created_at > NOW() - INTERVAL '24 hours') INTO v_is_new_user
  FROM public.profiles
  WHERE id = p_user_id;

  -- Credit user's wallet
  PERFORM public.update_user_balance(
    p_user_id,
    v_amount,
    'credit',
    'Gift claimed from gift room',
    'gift_claim_' || p_reservation_id
  );

  -- Get the wallet transaction ID for reference
  SELECT id INTO v_wallet_transaction_id
  FROM public.wallet_transactions
  WHERE user_id = p_user_id AND reference = 'gift_claim_' || p_reservation_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create gift claim record
  INSERT INTO public.gift_claims (
    reservation_id, user_id, amount, transaction_id, referral_bonus_awarded
  ) VALUES (
    p_reservation_id, p_user_id, v_amount, v_wallet_transaction_id, v_is_new_user
  ) RETURNING id INTO v_claim_id;

  -- Update reservation status
  UPDATE public.reservations
  SET status = 'claimed', user_id = p_user_id, claimed_at = NOW()
  WHERE id = p_reservation_id;

  -- Update room claimed count
  UPDATE public.gift_rooms
  SET claimed_count = claimed_count + 1, updated_at = NOW()
  WHERE id = v_room_id;

  -- Award referral bonus if new user
  IF v_is_new_user THEN
    PERFORM public.update_user_balance(
      v_sender_id,
      100.00,
      'credit',
      'Referral bonus for gift room signup',
      'referral_bonus_' || p_user_id
    );
  END IF;

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, user_id, activity_type, details)
  VALUES (v_room_id, p_user_id, 'claimed', jsonb_build_object(
    'claim_id', v_claim_id,
    'amount', v_amount,
    'referral_bonus_awarded', v_is_new_user
  ));

  RETURN v_claim_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create triggers for updated_at
CREATE TRIGGER update_gift_rooms_updated_at
  BEFORE UPDATE ON public.gift_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 10. Create function for cleanup expired items
CREATE OR REPLACE FUNCTION public.cleanup_expired_gift_rooms()
RETURNS INTEGER AS $
DECLARE
  v_expired_count INTEGER := 0;
  v_room RECORD;
  v_refund_amount DECIMAL;
BEGIN
  -- Process expired gift rooms
  FOR v_room IN 
    SELECT id, sender_id, total_amount, claimed_count, amount
    FROM public.gift_rooms
    WHERE status IN ('active', 'full') AND expires_at < NOW()
  LOOP
    -- Calculate refund amount (unclaimed gifts)
    v_refund_amount := (v_room.total_amount / v_room.amount) - v_room.claimed_count;
    v_refund_amount := v_refund_amount * v_room.amount;

    -- Refund unclaimed amount to sender
    IF v_refund_amount > 0 THEN
      PERFORM public.update_user_balance(
        v_room.sender_id,
        v_refund_amount,
        'credit',
        'Refund for expired gift room',
        'gift_room_refund_' || v_room.id
      );
    END IF;

    -- Update room status
    UPDATE public.gift_rooms
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_room.id;

    -- Log activity
    INSERT INTO public.gift_room_activities (room_id, user_id, activity_type, details)
    VALUES (v_room.id, v_room.sender_id, 'expired', jsonb_build_object(
      'refund_amount', v_refund_amount
    ));

    v_expired_count := v_expired_count + 1;
  END LOOP;

  -- Expire old reservations
  UPDATE public.reservations
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();

  RETURN v_expired_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Add total_spent tracking for referral tiers (if not exists)
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_spent') THEN
    ALTER TABLE public.profiles ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END
$;