-- Function to claim gift
CREATE OR REPLACE FUNCTION public.claim_gift(
  p_reservation_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;