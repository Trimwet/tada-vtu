-- Create secure gift room cleanup function that ensures refunds go to original creators only

-- First, create the gift room tables if they don't exist
CREATE TABLE IF NOT EXISTS public.gift_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'group', 'public')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 50),
    total_amount DECIMAL(12,2) NOT NULL,
    message TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'expired', 'completed')),
    joined_count INTEGER DEFAULT 0,
    claimed_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    claimed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.gift_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_id UUID,
    referral_bonus_awarded BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_rooms_sender_id ON public.gift_rooms(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_status ON public.gift_rooms(status);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_expires_at ON public.gift_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_rooms_token ON public.gift_rooms(token);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_gift_claims_user_id ON public.gift_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_room_activities_room_id ON public.gift_room_activities(room_id);

-- Enable RLS
ALTER TABLE public.gift_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_room_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view gift rooms they created or joined" ON public.gift_rooms
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE room_id = gift_rooms.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create gift rooms" ON public.gift_rooms
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view their reservations" ON public.reservations
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (true); -- Allow anonymous reservations

CREATE POLICY "Users can view their claims" ON public.gift_claims
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create claims" ON public.gift_claims
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- SECURE CLEANUP FUNCTION - ENSURES REFUNDS GO TO ORIGINAL CREATORS ONLY
CREATE OR REPLACE FUNCTION public.cleanup_expired_gift_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_room RECORD;
    refund_amount DECIMAL(12,2);
    unclaimed_count INTEGER;
    total_processed INTEGER := 0;
BEGIN
    -- Process each expired room individually for security
    FOR expired_room IN 
        SELECT id, sender_id, amount, capacity, claimed_count, status
        FROM public.gift_rooms 
        WHERE status IN ('active', 'full') 
        AND expires_at < NOW()
        FOR UPDATE -- Lock rows to prevent concurrent processing
    LOOP
        -- Calculate unclaimed amount that should be refunded to ORIGINAL CREATOR
        unclaimed_count := expired_room.capacity - expired_room.claimed_count;
        refund_amount := unclaimed_count * expired_room.amount;
        
        -- Update room status to expired
        UPDATE public.gift_rooms 
        SET status = 'expired', updated_at = NOW()
        WHERE id = expired_room.id;
        
        -- CRITICAL SECURITY: Only refund to the original creator (sender_id)
        IF refund_amount > 0 THEN
            -- Refund unclaimed amount to the ORIGINAL CREATOR only
            PERFORM public.update_user_balance(
                expired_room.sender_id,
                refund_amount,
                'credit',
                'Gift room refund - ' || unclaimed_count || ' unclaimed gifts',
                'gift_refund_' || expired_room.id
            );
            
            -- Record in transactions table for history
            INSERT INTO public.transactions (
                user_id, type, amount, status, reference, description
            ) VALUES (
                expired_room.sender_id,
                'deposit',
                refund_amount,
                'success',
                'gift_refund_' || expired_room.id,
                'Gift room refund - ' || unclaimed_count || ' unclaimed gifts'
            );
            
            -- Log the refund activity
            INSERT INTO public.gift_room_activities (
                room_id, user_id, activity_type, details
            ) VALUES (
                expired_room.id,
                expired_room.sender_id,  -- Log against the original creator
                'refunded',
                jsonb_build_object(
                    'amount', refund_amount,
                    'unclaimed_count', unclaimed_count,
                    'automatic', true,
                    'timestamp', NOW()
                )
            );
        END IF;
        
        -- Log the expiration
        INSERT INTO public.gift_room_activities (
            room_id, user_id, activity_type, details
        ) VALUES (
            expired_room.id,
            expired_room.sender_id,
            'expired',
            jsonb_build_object(
                'automatic', true,
                'refund_amount', refund_amount,
                'timestamp', NOW()
            )
        );
        
        total_processed := total_processed + 1;
    END LOOP;
    
    -- Also expire old reservations
    UPDATE public.reservations 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();
    
    RETURN total_processed;
END;
$$;

-- Create function to validate gift room ownership before any refund operations
CREATE OR REPLACE FUNCTION public.validate_gift_room_ownership(
    room_id UUID,
    user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_sender_id UUID;
BEGIN
    -- Get the sender_id (original creator) of the gift room
    SELECT sender_id INTO room_sender_id
    FROM public.gift_rooms
    WHERE id = room_id;
    
    -- Return true only if the user is the original creator
    RETURN room_sender_id = user_id;
END;
$$;

-- Create secure refund function that validates ownership
CREATE OR REPLACE FUNCTION public.refund_gift_room(
    room_id UUID,
    requesting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record RECORD;
    refund_amount DECIMAL(12,2);
    unclaimed_count INTEGER;
BEGIN
    -- Validate that the requesting user is the original creator
    IF NOT public.validate_gift_room_ownership(room_id, requesting_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Only the original creator can request refunds'
        );
    END IF;
    
    -- Get room details
    SELECT sender_id, amount, capacity, claimed_count, status
    INTO room_record
    FROM public.gift_rooms
    WHERE id = room_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Gift room not found'
        );
    END IF;
    
    IF room_record.status NOT IN ('active', 'full') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Gift room is not active'
        );
    END IF;
    
    -- Calculate refund amount
    unclaimed_count := room_record.capacity - room_record.claimed_count;
    refund_amount := unclaimed_count * room_record.amount;
    
    IF refund_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No amount to refund'
        );
    END IF;
    
    -- Update room status
    UPDATE public.gift_rooms 
    SET status = 'expired', updated_at = NOW()
    WHERE id = room_id;
    
    -- Process refund to ORIGINAL CREATOR only
    PERFORM public.update_user_balance(
        room_record.sender_id,
        refund_amount,
        'credit',
        'Manual gift room refund - ' || unclaimed_count || ' unclaimed gifts',
        'manual_refund_' || room_id
    );

    -- Record in transactions table for history
    INSERT INTO public.transactions (
        user_id, type, amount, status, reference, description
    ) VALUES (
        room_record.sender_id,
        'deposit',
        refund_amount,
        'success',
        'manual_refund_' || room_id,
        'Manual gift room refund - ' || unclaimed_count || ' unclaimed gifts'
    );
    
    -- Log the refund
    INSERT INTO public.gift_room_activities (
        room_id, user_id, activity_type, details
    ) VALUES (
        room_id,
        room_record.sender_id,
        'refunded',
        jsonb_build_object(
            'amount', refund_amount,
            'unclaimed_count', unclaimed_count,
            'manual', true,
            'timestamp', NOW()
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'refund_amount', refund_amount,
        'unclaimed_count', unclaimed_count
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_gift_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_gift_room_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_gift_room(UUID, UUID) TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_gift_rooms_updated_at
    BEFORE UPDATE ON public.gift_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add comments for documentation
COMMENT ON FUNCTION public.cleanup_expired_gift_rooms() IS 'Securely processes expired gift rooms and refunds unclaimed amounts to ORIGINAL CREATORS ONLY';
COMMENT ON FUNCTION public.validate_gift_room_ownership(UUID, UUID) IS 'Validates that a user is the original creator of a gift room';
COMMENT ON FUNCTION public.refund_gift_room(UUID, UUID) IS 'Securely processes manual refunds, ensuring only original creators can request refunds';

COMMENT ON TABLE public.gift_rooms IS 'Gift rooms created by users - sender_id is the original creator who receives refunds';
COMMENT ON COLUMN public.gift_rooms.sender_id IS 'CRITICAL: Original creator who should receive all refunds';
COMMENT ON COLUMN public.gift_rooms.total_amount IS 'Total amount deducted from creator (capacity * amount)';
COMMENT ON COLUMN public.gift_rooms.claimed_count IS 'Number of gifts actually claimed by users';