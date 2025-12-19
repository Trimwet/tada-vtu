-- Smart Features Migration: Price Optimizer & Scheduled Purchases
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. SCHEDULED PURCHASES
-- ============================================

CREATE TABLE IF NOT EXISTS public.scheduled_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- What to purchase
  service_type TEXT NOT NULL CHECK (service_type IN ('airtime', 'data', 'cable', 'electricity')),
  amount DECIMAL(12,2) NOT NULL,
  recipient_phone TEXT,
  network TEXT,
  data_plan_id TEXT,
  meter_number TEXT,
  smartcard_number TEXT,
  
  -- Schedule configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  custom_days INTEGER[], -- For custom: [1,15] = 1st and 15th of month
  preferred_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'Africa/Lagos',
  
  -- Smart scheduling
  smart_timing_enabled BOOLEAN DEFAULT false, -- Buy during off-peak/promo times
  
  -- Execution tracking
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_status TEXT CHECK (last_status IN ('success', 'failed', 'insufficient_balance', 'service_unavailable')),
  last_error TEXT,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 30,
  
  -- Stats
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  
  -- Notifications
  notify_on_success BOOLEAN DEFAULT true,
  notify_on_failure BOOLEAN DEFAULT true,
  notify_before_run BOOLEAN DEFAULT false, -- Remind 1 hour before
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional end date
);

-- Scheduled purchase execution log
CREATE TABLE IF NOT EXISTS public.scheduled_purchase_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_purchase_id UUID REFERENCES public.scheduled_purchases(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'insufficient_balance', 'service_unavailable', 'retrying')),
  amount DECIMAL(12,2) NOT NULL,
  
  -- Transaction reference
  transaction_id UUID REFERENCES public.transactions(id),
  external_reference TEXT,
  
  -- Error details
  error_message TEXT,
  retry_attempt INTEGER DEFAULT 0,
  
  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SMART PRICE OPTIMIZER
-- ============================================

-- User spending patterns (aggregated daily)
CREATE TABLE IF NOT EXISTS public.user_spending_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Time period
  period_date DATE NOT NULL,
  
  -- Spending by category
  airtime_spent DECIMAL(12,2) DEFAULT 0,
  data_spent DECIMAL(12,2) DEFAULT 0,
  cable_spent DECIMAL(12,2) DEFAULT 0,
  electricity_spent DECIMAL(12,2) DEFAULT 0,
  
  -- Data usage patterns
  data_gb_purchased DECIMAL(10,2) DEFAULT 0,
  preferred_network TEXT,
  
  -- Transaction counts
  transaction_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_date)
);

-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS public.smart_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Recommendation details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('plan_switch', 'timing', 'bundle', 'savings_tip')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Suggested action
  suggested_network TEXT,
  suggested_plan TEXT,
  suggested_amount DECIMAL(12,2),
  potential_savings DECIMAL(12,2),
  savings_percentage DECIMAL(5,2),
  
  -- Confidence and reasoning
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning TEXT,
  
  -- User interaction
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired')),
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Validity
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price tracking (admin-managed, updated periodically)
CREATE TABLE IF NOT EXISTS public.network_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  network TEXT NOT NULL CHECK (network IN ('MTN', 'AIRTEL', 'GLO', '9MOBILE')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('airtime', 'data_sme', 'data_gifting', 'data_corporate')),
  
  -- Plan details
  plan_name TEXT NOT NULL,
  data_amount_mb INTEGER, -- For data plans
  validity_days INTEGER,
  
  -- Pricing
  price DECIMAL(12,2) NOT NULL,
  our_price DECIMAL(12,2) NOT NULL, -- What we charge (with margin)
  
  -- Promo tracking
  is_promo BOOLEAN DEFAULT false,
  promo_ends_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scheduled_purchases_user ON public.scheduled_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_purchases_next_run ON public.scheduled_purchases(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_purchase_logs_schedule ON public.scheduled_purchase_logs(scheduled_purchase_id);

CREATE INDEX IF NOT EXISTS idx_user_spending_patterns_user ON public.user_spending_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spending_patterns_date ON public.user_spending_patterns(period_date);

CREATE INDEX IF NOT EXISTS idx_smart_recommendations_user ON public.smart_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_recommendations_status ON public.smart_recommendations(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_network_prices_network ON public.network_prices(network, plan_type);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.scheduled_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_purchase_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spending_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_prices ENABLE ROW LEVEL SECURITY;

-- Scheduled purchases policies
CREATE POLICY "Users can view own scheduled purchases" ON public.scheduled_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create scheduled purchases" ON public.scheduled_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled purchases" ON public.scheduled_purchases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled purchases" ON public.scheduled_purchases
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled purchase logs policies
CREATE POLICY "Users can view own schedule logs" ON public.scheduled_purchase_logs
  FOR SELECT USING (
    scheduled_purchase_id IN (
      SELECT id FROM public.scheduled_purchases WHERE user_id = auth.uid()
    )
  );

-- Spending patterns policies
CREATE POLICY "Users can view own spending patterns" ON public.user_spending_patterns
  FOR SELECT USING (auth.uid() = user_id);

-- Recommendations policies
CREATE POLICY "Users can view own recommendations" ON public.smart_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON public.smart_recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- Network prices are public (read-only for users)
CREATE POLICY "Anyone can view network prices" ON public.network_prices
  FOR SELECT USING (true);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Calculate next run time based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_run(
  p_frequency TEXT,
  p_custom_days INTEGER[],
  p_preferred_time TIME,
  p_last_run TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_today DATE := CURRENT_DATE;
  v_next_day INTEGER;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_run := (v_today + INTERVAL '1 day') + p_preferred_time;
    WHEN 'weekly' THEN
      v_next_run := (v_today + INTERVAL '7 days') + p_preferred_time;
    WHEN 'biweekly' THEN
      v_next_run := (v_today + INTERVAL '14 days') + p_preferred_time;
    WHEN 'monthly' THEN
      v_next_run := (v_today + INTERVAL '1 month') + p_preferred_time;
    WHEN 'custom' THEN
      -- Find next day in custom_days array
      SELECT MIN(d) INTO v_next_day
      FROM unnest(p_custom_days) AS d
      WHERE d > EXTRACT(DAY FROM v_today);
      
      IF v_next_day IS NULL THEN
        -- Wrap to next month, use first day in array
        v_next_run := (DATE_TRUNC('month', v_today) + INTERVAL '1 month' + 
                      (p_custom_days[1] - 1) * INTERVAL '1 day') + p_preferred_time;
      ELSE
        v_next_run := (DATE_TRUNC('month', v_today) + 
                      (v_next_day - 1) * INTERVAL '1 day') + p_preferred_time;
      END IF;
    ELSE
      v_next_run := (v_today + INTERVAL '1 day') + p_preferred_time;
  END CASE;
  
  -- Ensure next run is in the future
  IF v_next_run <= NOW() THEN
    v_next_run := v_next_run + INTERVAL '1 day';
  END IF;
  
  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Update spending patterns after transaction
CREATE OR REPLACE FUNCTION public.update_spending_pattern()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    INSERT INTO public.user_spending_patterns (
      user_id, period_date,
      airtime_spent, data_spent, cable_spent, electricity_spent,
      transaction_count, preferred_network
    )
    VALUES (
      NEW.user_id,
      CURRENT_DATE,
      CASE WHEN NEW.type = 'airtime' THEN ABS(NEW.amount) ELSE 0 END,
      CASE WHEN NEW.type = 'data' THEN ABS(NEW.amount) ELSE 0 END,
      CASE WHEN NEW.type = 'cable' THEN ABS(NEW.amount) ELSE 0 END,
      CASE WHEN NEW.type = 'electricity' THEN ABS(NEW.amount) ELSE 0 END,
      1,
      NEW.network
    )
    ON CONFLICT (user_id, period_date) DO UPDATE SET
      airtime_spent = user_spending_patterns.airtime_spent + 
        CASE WHEN NEW.type = 'airtime' THEN ABS(NEW.amount) ELSE 0 END,
      data_spent = user_spending_patterns.data_spent + 
        CASE WHEN NEW.type = 'data' THEN ABS(NEW.amount) ELSE 0 END,
      cable_spent = user_spending_patterns.cable_spent + 
        CASE WHEN NEW.type = 'cable' THEN ABS(NEW.amount) ELSE 0 END,
      electricity_spent = user_spending_patterns.electricity_spent + 
        CASE WHEN NEW.type = 'electricity' THEN ABS(NEW.amount) ELSE 0 END,
      transaction_count = user_spending_patterns.transaction_count + 1,
      preferred_network = COALESCE(NEW.network, user_spending_patterns.preferred_network);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update spending patterns
DROP TRIGGER IF EXISTS update_spending_on_transaction ON public.transactions;
CREATE TRIGGER update_spending_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_spending_pattern();

-- ============================================
-- 6. SEED DATA: Sample Network Prices
-- ============================================

INSERT INTO public.network_prices (network, plan_type, plan_name, data_amount_mb, validity_days, price, our_price, is_active)
VALUES
  -- MTN Data Plans
  ('MTN', 'data_sme', '500MB SME', 500, 30, 140, 135, true),
  ('MTN', 'data_sme', '1GB SME', 1024, 30, 260, 250, true),
  ('MTN', 'data_sme', '2GB SME', 2048, 30, 520, 500, true),
  ('MTN', 'data_sme', '5GB SME', 5120, 30, 1300, 1250, true),
  ('MTN', 'data_gifting', '1GB Gifting', 1024, 30, 300, 290, true),
  ('MTN', 'data_gifting', '2GB Gifting', 2048, 30, 600, 580, true),
  
  -- Airtel Data Plans
  ('AIRTEL', 'data_sme', '500MB SME', 500, 30, 140, 135, true),
  ('AIRTEL', 'data_sme', '1GB SME', 1024, 30, 260, 250, true),
  ('AIRTEL', 'data_sme', '2GB SME', 2048, 30, 520, 500, true),
  ('AIRTEL', 'data_gifting', '1GB Gifting', 1024, 30, 300, 290, true),
  
  -- Glo Data Plans
  ('GLO', 'data_sme', '1GB SME', 1024, 30, 250, 240, true),
  ('GLO', 'data_sme', '2GB SME', 2048, 30, 500, 480, true),
  ('GLO', 'data_sme', '5GB SME', 5120, 30, 1250, 1200, true),
  
  -- 9Mobile Data Plans
  ('9MOBILE', 'data_sme', '1GB SME', 1024, 30, 250, 240, true),
  ('9MOBILE', 'data_sme', '2GB SME', 2048, 30, 500, 480, true)
ON CONFLICT DO NOTHING;
