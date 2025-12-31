-- Fix gift room capacity checking issues
-- This migration addresses race conditions and inconsistent capacity calculations

-- Drop existing create_reservation function
DROP FUNCTION IF EXISTS public.create_reservation(UUID, TEXT, JSONB, UUID);

-- Create improved create_reservation function with proper capacity checking
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_room_id UUID,
  p_device_fingerprint TEXT,
  p_contact_info JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_reservation_id UUID;
  v_temp_token TEXT;
  v_room_capacity INTEGER;
  v_active_reservations_count INTEGER;
  v_room_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_room_type TEXT;
  v_existing_reservation RECORD;
  v_room_sender_id UUID;
BEGIN
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
  IF p_user_id IS NOT NULL AND p_user_id = v_room_sender_id THEN
    RAISE EXCEPTION 'You cannot join your own gift room';
  END IF;

  -- Clean up expired reservations first
  DELETE FROM public.reservations 
  WHERE room_id = p_room_id 
  AND status = 'active' 
  AND expires_at < NOW();

  -- Check for existing active reservation (idempotency)
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_existing_reservation 
    FROM public.reservations 
    WHERE room_id = p_room_id 
    AND status = 'active'
    AND (device_fingerprint = p_device_fingerprint OR user_id = p_user_id)
    LIMIT 1;
  ELSE
    SELECT * INTO v_existing_reservation 
    FROM public.reservations 
    WHERE room_id = p_room_id 
    AND status = 'active'
    AND device_fingerprint = p_device_fingerprint 
    LIMIT 1;
  END IF;

  -- If reservation exists, update user_id if needed and return
  IF v_existing_reservation IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND v_existing_reservation.user_id IS NULL THEN
      UPDATE public.reservations 
      SET user_id = p_user_id, updated_at = NOW()
      WHERE id = v_existing_reservation.id;
    END IF;
    
    RETURN v_existing_reservation.id;
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

  -- Create new reservation
  INSERT INTO public.reservations (
    room_id, device_fingerprint, temp_token, contact_info, expires_at, user_id
  ) VALUES (
    p_room_id, p_device_fingerprint, v_temp_token, p_contact_info, v_expires_at, p_user_id
  ) RETURNING id INTO v_reservation_id;

  -- Update room joined_count and status based on actual reservations
  v_active_reservations_count := v_active_reservations_count + 1;
  
  UPDATE public.gift_rooms
  SET joined_count = v_active_reservations_count,
      status = CASE WHEN v_active_reservations_count >= v_room_capacity THEN 'full' ELSE 'active' END,
      updated_at = NOW()
  WHERE id = p_room_id;

  -- Log activity
  INSERT INTO public.gift_room_activities (room_id, activity_type, details, user_id)
  VALUES (p_room_id, 'joined', jsonb_build_object(
    'reservation_id', v_reservation_id,
    'device_fingerprint', p_device_fingerprint,
    'active_reservations', v_active_reservations_count,
    'capacity', v_room_capacity
  ), p_user_id);

  RETURN v_reservation_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error for debugging
    INSERT INTO public.gift_room_activities (room_id, activity_type, details, user_id)
    VALUES (p_room_id, 'join_failed', jsonb_build_object(
      'error', SQLERRM,
      'device_fingerprint', p_device_fingerprint,
      'sqlstate', SQLSTATE
    ), p_user_id)
    ON CONFLICT DO NOTHING;
    
    RAISE;
END;
$;

-- Create function to sync joined_count with actual active reservations
CREATE OR REPLACE FUNCTION public.sync_gift_room_counts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  room_record RECORD;
  actual_count INTEGER;
  updated_rooms INTEGER := 0;
BEGIN
  -- Clean up expired reservations first
  DELETE FROM public.reservations 
  WHERE status = 'active' 
  AND expires_at < NOW();

  -- Update each room's joined_count based on actual active reservations
  FOR room_record IN 
    SELECT id, capacity, joined_count, status
    FROM public.gift_rooms 
    WHERE status IN ('active', 'full')
  LOOP
    -- Count actual active reservations
    SELECT COUNT(*) INTO actual_count
    FROM public.reservations
    WHERE room_id = room_record.id 
    AND status = 'active'
    AND expires_at > NOW();

    -- Update if counts don't match
    IF actual_count != room_record.joined_count THEN
      UPDATE public.gift_rooms
      SET joined_count = actual_count,
          status = CASE 
            WHEN actual_count >= room_record.capacity THEN 'full' 
            ELSE 'active' 
          END,
          updated_at = NOW()
      WHERE id = room_record.id;
      
      updated_rooms := updated_rooms + 1;
    END IF;
  END LOOP;

  RETURN updated_rooms;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_reservation(UUID, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_gift_room_counts() TO authenticated;

-- Run initial sync to fix any existing inconsistencies
SELECT public.sync_gift_room_counts();

-- Add comments
COMMENT ON FUNCTION public.create_reservation(UUID, TEXT, JSONB, UUID) IS 'Creates gift room reservations with proper capacity checking and race condition prevention';
COMMENT ON FUNCTION public.sync_gift_room_counts() IS 'Syncs gift room joined_count with actual active reservations';