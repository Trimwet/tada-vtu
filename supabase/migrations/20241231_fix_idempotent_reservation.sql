-- Drop previous versions
DROP FUNCTION IF EXISTS public.create_reservation(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_reservation(UUID, TEXT, JSONB, UUID);

-- Recreate function with IDEMPOTENT logic
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_room_id UUID,
  p_device_fingerprint TEXT,
  p_contact_info JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id UUID;
  v_temp_token TEXT;
  v_room_capacity INTEGER;
  v_room_joined_count INTEGER;
  v_room_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_room_type TEXT;
  v_existing_reservation RECORD;
BEGIN
  -- 1. IDEMPOTENCY CHECK: Check if reservation ALREADY exists for this device or user
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_existing_reservation FROM public.reservations 
    WHERE room_id = p_room_id AND (device_fingerprint = p_device_fingerprint OR user_id = p_user_id) 
    LIMIT 1;
  ELSE
    SELECT * INTO v_existing_reservation FROM public.reservations 
    WHERE room_id = p_room_id AND device_fingerprint = p_device_fingerprint 
    LIMIT 1;
  END IF;

  -- If it exists, we just return it (and fix user_id if needed)
  IF v_existing_reservation IS NOT NULL THEN
    -- If we now have a user_id but the valid reservation doesn't, link it!
    IF p_user_id IS NOT NULL AND v_existing_reservation.user_id IS NULL THEN
      UPDATE public.reservations 
      SET user_id = p_user_id, updated_at = NOW()
      WHERE id = v_existing_reservation.id;
    END IF;
    
    RETURN v_existing_reservation.id;
  END IF;

  -- 2. STANDARD CHECKS (Only if we don't have a spot yet)
  
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

  -- 3. CREATE NEW RESERVATION
  
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
    room_id, device_fingerprint, temp_token, contact_info, expires_at, user_id
  ) VALUES (
    p_room_id, p_device_fingerprint, v_temp_token, p_contact_info, v_expires_at, p_user_id
  ) RETURNING id INTO v_reservation_id;

  -- Update room joined count
  UPDATE public.gift_rooms
  SET joined_count = joined_count + 1,
      status = CASE WHEN joined_count + 1 >= capacity THEN 'full' ELSE 'active' END,
      updated_at = NOW()
  WHERE id = p_room_id;

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, activity_type, details, user_id)
  VALUES (p_room_id, 'joined', jsonb_build_object(
    'reservation_id', v_reservation_id,
    'device_fingerprint', p_device_fingerprint
  ), p_user_id);

  RETURN v_reservation_id;
END;
$$;
