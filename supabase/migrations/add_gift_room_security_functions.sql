-- Add secure gift room cleanup functions (without recreating existing tables/policies)

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
        SELECT id, creator_id, amount, capacity, claimed_count, status
        FROM public.gift_rooms 
        WHERE status = 'active' 
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
        
        -- CRITICAL SECURITY: Only refund to the original creator (creator_id)
        IF refund_amount > 0 THEN
            -- Refund unclaimed amount to the ORIGINAL CREATOR only
            UPDATE public.profiles 
            SET wallet_balance = wallet_balance + refund_amount,
                updated_at = NOW()
            WHERE id = expired_room.creator_id;
            
            -- Log the transaction
            INSERT INTO public.transactions (
                user_id, type, amount, description, reference, status
            ) VALUES (
                expired_room.creator_id,
                'credit',
                refund_amount,
                'Gift room refund - ' || unclaimed_count || ' unclaimed gifts',
                'gift_refund_' || expired_room.id,
                'completed'
            );
            
            -- Log the refund activity if activities table exists
            INSERT INTO public.gift_room_activities (
                gift_room_id, user_id, activity_type, details
            ) VALUES (
                expired_room.id,
                expired_room.creator_id,  -- Log against the original creator
                'refunded',
                jsonb_build_object(
                    'amount', refund_amount,
                    'unclaimed_count', unclaimed_count,
                    'automatic', true,
                    'timestamp', NOW()
                )
            ) ON CONFLICT DO NOTHING; -- In case table doesn't exist yet
        END IF;
        
        -- Log the expiration
        INSERT INTO public.gift_room_activities (
            gift_room_id, user_id, activity_type, details
        ) VALUES (
            expired_room.id,
            expired_room.creator_id,
            'expired',
            jsonb_build_object(
                'automatic', true,
                'refund_amount', refund_amount,
                'timestamp', NOW()
            )
        ) ON CONFLICT DO NOTHING; -- In case table doesn't exist yet
        
        total_processed := total_processed + 1;
    END LOOP;
    
    -- Also expire old reservations if table exists
    UPDATE public.reservations 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();
    
    RETURN total_processed;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail completely
        RAISE WARNING 'Error in cleanup_expired_gift_rooms: %', SQLERRM;
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
    room_creator_id UUID;
BEGIN
    -- Get the creator_id (original creator) of the gift room
    SELECT creator_id INTO room_creator_id
    FROM public.gift_rooms
    WHERE id = room_id;
    
    -- Return true only if the user is the original creator
    RETURN room_creator_id = user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
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
    SELECT creator_id, amount, capacity, claimed_count, status
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
    
    IF room_record.status != 'active' THEN
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
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + refund_amount,
        updated_at = NOW()
    WHERE id = room_record.creator_id;
    
    -- Log the transaction
    INSERT INTO public.transactions (
        user_id, type, amount, description, reference, status
    ) VALUES (
        room_record.creator_id,
        'credit',
        refund_amount,
        'Manual gift room refund - ' || unclaimed_count || ' unclaimed gifts',
        'manual_refund_' || room_id,
        'completed'
    );
    
    -- Log the refund activity
    INSERT INTO public.gift_room_activities (
        gift_room_id, user_id, activity_type, details
    ) VALUES (
        room_id,
        room_record.creator_id,
        'refunded',
        jsonb_build_object(
            'amount', refund_amount,
            'unclaimed_count', unclaimed_count,
            'manual', true,
            'timestamp', NOW()
        )
    ) ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
        'success', true,
        'refund_amount', refund_amount,
        'unclaimed_count', unclaimed_count
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_gift_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_gift_room_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_gift_room(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.cleanup_expired_gift_rooms() IS 'Securely processes expired gift rooms and refunds unclaimed amounts to ORIGINAL CREATORS ONLY';
COMMENT ON FUNCTION public.validate_gift_room_ownership(UUID, UUID) IS 'Validates that a user is the original creator of a gift room';
COMMENT ON FUNCTION public.refund_gift_room(UUID, UUID) IS 'Securely processes manual refunds, ensuring only original creators can request refunds';