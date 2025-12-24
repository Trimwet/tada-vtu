-- Function to create gift room with validation
CREATE OR REPLACE FUNCTION public.create_gift_room(
  p_sender_id UUID,
  p_type TEXT,
  p_capacity INTEGER,
  p_amount DECIMAL,
  p_message TEXT DEFAULT NULL,
  p_expiration_hours INTEGER DEFAULT 48
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;