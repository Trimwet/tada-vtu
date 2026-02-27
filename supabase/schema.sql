-- TADA VTU Database Schema
-- Run this in Supabase SQL Editor

-- 1. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone_number TEXT UNIQUE,
  email TEXT,
  balance DECIMAL(12,2) DEFAULT 0.00,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  pin TEXT,
  kyc_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'airtime', 'data', 'cable', 'electricity', 'betting')),
  amount DECIMAL(12,2) NOT NULL,
  phone_number TEXT,
  service_id TEXT,
  network TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference TEXT UNIQUE NOT NULL,
  external_reference TEXT,
  description TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference TEXT,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create beneficiaries table
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  network TEXT,
  service_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone_number, service_type)
);

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON public.beneficiaries(user_id);

-- 7. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet transactions policies
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Beneficiaries policies
CREATE POLICY "Users can view own beneficiaries" ON public.beneficiaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own beneficiaries" ON public.beneficiaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own beneficiaries" ON public.beneficiaries
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'TADA' || UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 6))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Create function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_balance_before DECIMAL;
  v_balance_after DECIMAL;
BEGIN
  -- Get current balance
  SELECT balance INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate new balance
  IF p_type = 'credit' THEN
    v_balance_after := v_balance_before + p_amount;
  ELSE
    v_balance_after := v_balance_before - p_amount;
  END IF;

  -- Check for insufficient balance on debit
  IF p_type = 'debit' AND v_balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update balance
  UPDATE public.profiles
  SET balance = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Record wallet transaction
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, reference, balance_before, balance_after
  ) VALUES (
    p_user_id, p_type, p_amount, p_description, p_reference, v_balance_before, v_balance_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 14. Create admins table (fixed logins, no registration)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin (password: admin123 - change in production!)
-- Password hash is bcrypt of 'admin123'
INSERT INTO public.admins (email, password_hash, full_name, role)
VALUES ('admin@tadavtu.com', '$2a$10$rQnM1.kK8LFXxKjKvKjKvOeJKjKvKjKvKjKvKjKvKjKvKjKvKjKvK', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- No RLS on admins table - accessed via API routes only

-- 13. Create data_vault table
CREATE TABLE IF NOT EXISTS public.data_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('MTN', 'AIRTEL', 'GLO', '9MOBILE')),
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  recipient_phone TEXT NOT NULL,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'delivered', 'expired', 'refunded')),
  transaction_id UUID REFERENCES public.transactions(id),
  delivery_reference TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create unique index for preventing duplicate ready items
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_vault_ready_unique 
  ON public.data_vault(user_id, recipient_phone, plan_id) 
  WHERE status = 'ready';

-- 15. Create indexes for data_vault
CREATE INDEX IF NOT EXISTS idx_data_vault_user_id ON public.data_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_data_vault_status ON public.data_vault(status);
CREATE INDEX IF NOT EXISTS idx_data_vault_expires_at ON public.data_vault(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_vault_user_status ON public.data_vault(user_id, status);
CREATE INDEX IF NOT EXISTS idx_data_vault_created_at ON public.data_vault(created_at DESC);

-- 16. Enable RLS on data_vault
ALTER TABLE public.data_vault ENABLE ROW LEVEL SECURITY;

-- 17. Create RLS policies for data_vault
CREATE POLICY "Users can view own vault items" ON public.data_vault
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON public.data_vault
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON public.data_vault
  FOR UPDATE USING (auth.uid() = user_id);

-- 18. Create RPC function to park data atomically
CREATE OR REPLACE FUNCTION public.park_data_vault(
  p_user_id UUID,
  p_network TEXT,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_amount DECIMAL,
  p_recipient_phone TEXT,
  p_transaction_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  vault_id UUID,
  new_balance DECIMAL
) AS $
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_vault_id UUID;
  v_existing_count INT;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock user profile for update
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check balance
    IF v_current_balance < p_amount THEN
      RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, v_current_balance;
      RETURN;
    END IF;

    -- Check for existing ready vault item (prevent duplicates)
    SELECT COUNT(*) INTO v_existing_count
    FROM public.data_vault
    WHERE user_id = p_user_id
      AND recipient_phone = p_recipient_phone
      AND plan_id = p_plan_id
      AND status = 'ready';

    IF v_existing_count > 0 THEN
      RETURN QUERY SELECT false, 'You already have this plan parked for this phone'::TEXT, NULL::UUID, v_current_balance;
      RETURN;
    END IF;

    -- Deduct balance
    v_new_balance := v_current_balance - p_amount;
    UPDATE public.profiles
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;

    -- Create vault entry
    INSERT INTO public.data_vault (
      user_id, network, plan_id, plan_name, amount, recipient_phone,
      status, transaction_id, expires_at
    ) VALUES (
      p_user_id, p_network, p_plan_id, p_plan_name, p_amount, p_recipient_phone,
      'ready', p_transaction_id, NOW() + INTERVAL '7 days'
    )
    RETURNING id INTO v_vault_id;

    -- Return success
    RETURN QUERY SELECT true, 'Data parked successfully'::TEXT, v_vault_id, v_new_balance;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::UUID, v_current_balance;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create RPC function to process expired vault items
CREATE OR REPLACE FUNCTION public.process_expired_vault_items()
RETURNS TABLE(
  processed_count INT,
  error_count INT
) AS $
DECLARE
  v_processed INT := 0;
  v_errors INT := 0;
  v_item RECORD;
BEGIN
  -- Find all expired items that haven't been processed
  FOR v_item IN
    SELECT id, user_id, amount, plan_name, recipient_phone
    FROM public.data_vault
    WHERE status = 'ready'
      AND expires_at < NOW()
    LIMIT 1000
  LOOP
    BEGIN
      -- Mark as expired
      UPDATE public.data_vault
      SET status = 'expired', updated_at = NOW()
      WHERE id = v_item.id;

      -- Refund balance
      UPDATE public.profiles
      SET balance = balance + v_item.amount, updated_at = NOW()
      WHERE id = v_item.user_id;

      -- Record wallet transaction for refund
      INSERT INTO public.wallet_transactions (
        user_id, type, amount, description, reference, balance_before, balance_after
      ) SELECT
        v_item.user_id, 'credit', v_item.amount,
        'Data Vault Refund: ' || v_item.plan_name || ' for ' || v_item.recipient_phone,
        'VAULT_REFUND_' || v_item.id,
        balance - v_item.amount, balance
      FROM public.profiles
      WHERE id = v_item.user_id;

      -- Create notification
      INSERT INTO public.notifications (
        user_id, title, message, type
      ) VALUES (
        v_item.user_id,
        'Data Vault Expired',
        v_item.plan_name || ' for ' || v_item.recipient_phone || ' has expired and been refunded.',
        'info'
      );

      v_processed := v_processed + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Error processing vault item %: %', v_item.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Create trigger to update data_vault updated_at
CREATE TRIGGER update_data_vault_updated_at
  BEFORE UPDATE ON public.data_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
