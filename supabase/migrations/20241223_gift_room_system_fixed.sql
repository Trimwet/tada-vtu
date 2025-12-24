-- Gift Room System Database Migration (Supabase Compatible)
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
DROP POLICY IF EXISTS "Users can view gift rooms they created" ON public.gift_rooms;
CREATE POLICY "Users can view gift rooms they created" ON public.gift_rooms
  FOR SELECT USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can create gift rooms" ON public.gift_rooms;
CREATE POLICY "Users can create gift rooms" ON public.gift_rooms
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update gift rooms they created" ON public.gift_rooms;
CREATE POLICY "Users can update gift rooms they created" ON public.gift_rooms
  FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Anyone can view active gift rooms by token" ON public.gift_rooms;
CREATE POLICY "Anyone can view active gift rooms by token" ON public.gift_rooms
  FOR SELECT USING (status = 'active');

-- Reservations policies
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
CREATE POLICY "Users can view their own reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations" ON public.reservations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
CREATE POLICY "Users can update their own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- Gift claims policies
DROP POLICY IF EXISTS "Users can view their own claims" ON public.gift_claims;
CREATE POLICY "Users can view their own claims" ON public.gift_claims
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create claims for their reservations" ON public.gift_claims;
CREATE POLICY "Users can create claims for their reservations" ON public.gift_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity logs policies (read-only for users)
DROP POLICY IF EXISTS "Users can view activities for their rooms" ON public.gift_room_activities;
CREATE POLICY "Users can view activities for their rooms" ON public.gift_room_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gift_rooms 
      WHERE id = room_id AND sender_id = auth.uid()
    )
  );

-- 8. Add total_spent tracking for referral tiers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_spent') THEN
    ALTER TABLE public.profiles ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END
$$;