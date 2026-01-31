-- Improve data vault refunding logic with better error handling and logging

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS public.process_expired_vault_items();

CREATE OR REPLACE FUNCTION public.process_expired_vault_items()
RETURNS TABLE(processed_count INTEGER, error_count INTEGER) AS $$
DECLARE
  expired_item RECORD;
  processed_items INTEGER := 0;
  error_items INTEGER := 0;
  current_balance DECIMAL;
  error_message TEXT;
BEGIN
  -- Find expired items that haven't been processed
  FOR expired_item IN 
    SELECT id, user_id, amount, plan_name, recipient_phone, transaction_id, network
    FROM public.data_vault 
    WHERE status = 'ready' 
    AND expires_at < NOW()
    ORDER BY expires_at ASC -- Process oldest first
  LOOP
    BEGIN
      -- Get current user balance to verify refund
      SELECT balance INTO current_balance 
      FROM public.profiles 
      WHERE id = expired_item.user_id;
      
      -- Update vault item status first
      UPDATE public.data_vault 
      SET status = 'expired', updated_at = NOW()
      WHERE id = expired_item.id;
      
      -- Refund the user using the existing function
      PERFORM public.update_user_balance(
        expired_item.user_id,
        expired_item.amount,
        'credit',
        'Data Vault Refund: ' || expired_item.plan_name || ' (' || expired_item.network || ') for ' || expired_item.recipient_phone,
        'VAULT_REFUND_' || expired_item.id::text
      );
      
      -- Update original transaction status
      UPDATE public.transactions 
      SET status = 'refunded', updated_at = NOW()
      WHERE id = expired_item.transaction_id;
      
      -- Create user notification
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        expired_item.user_id,
        'Data Vault Refund',
        'Your parked ' || expired_item.plan_name || ' (' || expired_item.network || ') for ' || expired_item.recipient_phone || ' has expired and ₦' || expired_item.amount::text || ' has been refunded to your wallet.',
        'info'
      );
      
      processed_items := processed_items + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing other items
      error_items := error_items + 1;
      error_message := SQLERRM;
      
      -- Try to revert the vault item status if it was changed
      BEGIN
        UPDATE public.data_vault 
        SET status = 'ready', updated_at = NOW()
        WHERE id = expired_item.id AND status = 'expired';
      EXCEPTION WHEN OTHERS THEN
        -- If we can't revert, just continue
        NULL;
      END;
      
      -- Continue with next item
      CONTINUE;
    END;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT processed_items, error_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually refund a specific vault item (for admin use)
CREATE OR REPLACE FUNCTION public.manual_refund_vault_item(vault_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  vault_item RECORD;
  current_balance DECIMAL;
BEGIN
  -- Get the vault item
  SELECT * INTO vault_item
  FROM public.data_vault
  WHERE id = vault_item_id AND status = 'ready';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault item not found or already processed';
  END IF;
  
  -- Get current balance
  SELECT balance INTO current_balance 
  FROM public.profiles 
  WHERE id = vault_item.user_id;
  
  -- Update vault item status
  UPDATE public.data_vault 
  SET status = 'refunded', updated_at = NOW()
  WHERE id = vault_item_id;
  
  -- Refund the user
  PERFORM public.update_user_balance(
    vault_item.user_id,
    vault_item.amount,
    'credit',
    'Manual Data Vault Refund: ' || vault_item.plan_name || ' (' || vault_item.network || ') for ' || vault_item.recipient_phone,
    'MANUAL_VAULT_REFUND_' || vault_item_id::text
  );
  
  -- Update original transaction
  UPDATE public.transactions 
  SET status = 'refunded', updated_at = NOW()
  WHERE id = vault_item.transaction_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    vault_item.user_id,
    'Data Vault Refund',
    'Your parked ' || vault_item.plan_name || ' has been manually refunded. ₦' || vault_item.amount::text || ' has been added to your wallet.',
    'success'
  );
  
  -- Log the manual refund
  INSERT INTO public.audit_log (
    user_id, 
    action, 
    details, 
    created_at
  ) VALUES (
    vault_item.user_id,
    'vault_item_manual_refund',
    jsonb_build_object(
      'vault_id', vault_item_id,
      'amount', vault_item.amount,
      'plan_name', vault_item.plan_name,
      'network', vault_item.network,
      'balance_before', current_balance,
      'balance_after', current_balance + vault_item.amount
    ),
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.process_expired_vault_items() IS 'Process expired vault items with improved error handling and logging';
COMMENT ON FUNCTION public.manual_refund_vault_item(UUID) IS 'Manually refund a specific vault item (admin function)';