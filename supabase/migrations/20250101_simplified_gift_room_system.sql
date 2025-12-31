-- Simplified Gift Room System Migration
-- This removes complexity and prevents orphaned reservations

-- Drop the complex create_reservation function if it exists
DROP FUNCTION IF EXISTS public.create_reservation(UUID, TEXT, JSONB, UUID);

-- Create simplified create_reservation function that requires user_id
CREATE OR REPLACE FUNCTION public.create_reservation_simple(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id UUID;
  v_temp_token TEXT;
  v_room_capacity INTEGER;
  v_active_reservations_count INTEGER;
  v_room_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_room_type TEXT;
  v_existing_reservation UUID;
  v_room_sender_id UUID;
BEGIN
  -- Validate inputs
  IF p_room_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Room ID and User ID are required';
  END IF;

  -- Lock the room row to prevent race conditions
  SELECT capacity, status, type, sender_id
  INTO v_room_capacity, v_room_status, v_room_type, v_room_sender_id
  FROM public.gift_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Check if room exists
  IF v_room_status IS NULL THEN
    RAISE EXCEPTION 'Gift room not found';
  END IF;

  -- Check if room is active
  IF v_room_status != 'active' THEN
    RAISE EXCEPTION 'Gift room is no longer active (status: %)', v_room_status;
  END IF;

  -- Prevent sender from joining their own room
  IF p_user_id = v_room_sender_id THEN
    RAISE EXCEPTION 'You cannot join your own gift room';
  END IF;

  -- Clean up expired reservations first
  DELETE FROM public.reservations 
  WHERE room_id = p_room_id 
  AND status = 'active' 
  AND expires_at < NOW();


  -- Check for existing active reservation (prevent duplicates)
  SELECT id INTO v_existing_reservation 
  FROM public.reservations 
  WHERE room_id = p_room_id 
  AND status = 'active'
  AND user_id = p_user_id
  AND expires_at > NOW()
  LIMIT 1;

  -- If reservation exists, return it
  IF v_existing_reservation IS NOT NULL THEN
    RETURN v_existing_reservation;
  END IF;

  -- Count actual active reservations (not relying on joined_count field)
  SELECT COUNT(*) INTO v_active_reservations_count
  FROM public.reservations
  WHERE room_id = p_room_id 
  AND status = 'active'
  AND expires_at > NOW();

  -- Check capacity against actual active reservations
  IF v_active_reservations_count >= v_room_capacity THEN
    RAISE EXCEPTION 'Gift room is full (% of % spots taken)', v_active_reservations_count, v_room_capacity;
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

  -- Create new reservation (SIMPLIFIED - no device fingerprint complexity)
  INSERT INTO public.reservations (
    room_id, 
    user_id, 
    temp_token, 
    expires_at,
    device_fingerprint,
    status
  ) VALUES (
    p_room_id, 
    p_user_id, 
    v_temp_token, 
    v_expires_at,
    'user_' || p_user_id::text,
    'active'
  ) RETURNING id INTO v_reservation_id;

  -- Update room joined_count and status based on actual reservations
  v_active_reservations_count := v_active_reservations_count + 1;
  
  UPDATE public.gift_rooms
  SET joined_count = v_active_reservations_count,
      status = CASE WHEN v_active_reservations_count >= v_room_capacity THEN 'full' ELSE 'active' END
  WHERE id = p_room_id;

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, activity_type, details, user_id)
  VALUES (p_room_id, 'joined', jsonb_build_object(
    'reservation_id', v_reservation_id,
    'active_reservations', v_active_reservations_count,
    'capacity', v_room_capacity,
    'simplified_flow', true
  ), p_user_id);

  RETURN v_reservation_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error for debugging
    INSERT INTO public.gift_room_activities (room_id, activity_type, details, user_id)
    VALUES (p_room_id, 'join_failed', jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'simplified_flow', true
    ), p_user_id)
    ON CONFLICT DO NOTHING;
    
    RAISE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_reservation_simple(UUID, UUID) TO authenticated;

-- Clean up orphaned reservations (no user_id)
DELETE FROM public.reservations 
WHERE user_id IS NULL 
AND status = 'active'
AND created_at < NOW() - INTERVAL '1 hour';

-- Sync all gift room counts
UPDATE public.gift_rooms 
SET joined_count = (
    SELECT COUNT(*) 
    FROM public.reservations r 
    WHERE r.room_id = gift_rooms.id 
      AND r.status = 'active' 
      AND r.expires_at > NOW()
),
status = CASE 
    WHEN (
        SELECT COUNT(*) 
        FROM public.reservations r 
        WHERE r.room_id = gift_rooms.id 
          AND r.status = 'active' 
          AND r.expires_at > NOW()
    ) >= capacity THEN 'full'
    WHEN expires_at < NOW() THEN 'expired'
    ELSE 'active'
END
WHERE status IN ('active', 'full');

COMMENT ON FUNCTION public.create_reservation_simple(UUID, UUID) IS 'Simplified gift room reservation - requires authentication, no device fingerprint complexity';
