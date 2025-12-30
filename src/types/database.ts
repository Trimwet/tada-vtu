export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Gift Cards Types (defined before Database interface for use in Tables)
export type GiftOccasion = 'birthday' | 'anniversary' | 'thanks' | 'love' | 'apology' | 'ramadan' | 'christmas' | 'eid' | 'graduation' | 'custom';
export type GiftStatus = 'pending' | 'scheduled' | 'delivered' | 'opened' | 'credited' | 'expired' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          email: string | null;
          balance: number;
          referral_code: string | null;
          referred_by: string | null;
          pin: string | null;
          kyc_level: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          // Loyalty fields
          loyalty_points: number;
          loyalty_tier: LoyaltyTier;
          total_points_earned: number;
          login_streak: number;
          longest_streak: number;
          last_login_date: string | null;
          spin_available: boolean;
          last_spin_date: string | null;
          birthday: string | null;
          total_spent: number;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone_number?: string | null;
          email?: string | null;
          balance?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          pin?: string | null;
          kyc_level?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          loyalty_points?: number;
          loyalty_tier?: LoyaltyTier;
          total_points_earned?: number;
          login_streak?: number;
          longest_streak?: number;
          last_login_date?: string | null;
          spin_available?: boolean;
          last_spin_date?: string | null;
          birthday?: string | null;
          total_spent?: number;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          email?: string | null;
          balance?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          pin?: string | null;
          kyc_level?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          loyalty_points?: number;
          loyalty_tier?: LoyaltyTier;
          total_points_earned?: number;
          login_streak?: number;
          longest_streak?: number;
          last_login_date?: string | null;
          spin_available?: boolean;
          last_spin_date?: string | null;
          birthday?: string | null;
          total_spent?: number;
        };
      };
      loyalty_transactions: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          type: 'earn' | 'redeem' | 'bonus' | 'expire';
          source: string;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          type: 'earn' | 'redeem' | 'bonus' | 'expire';
          source: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          type?: 'earn' | 'redeem' | 'bonus' | 'expire';
          source?: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
      };
      spin_history: {
        Row: {
          id: string;
          user_id: string;
          prize_type: 'points' | 'discount' | 'cashback' | 'nothing';
          prize_value: number;
          expires_at: string | null;
          is_claimed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prize_type: 'points' | 'discount' | 'cashback' | 'nothing';
          prize_value: number;
          expires_at?: string | null;
          is_claimed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prize_type?: 'points' | 'discount' | 'cashback' | 'nothing';
          prize_value?: number;
          expires_at?: string | null;
          is_claimed?: boolean;
          created_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          points_reward: number;
          requirement_type: string;
          requirement_value: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          points_reward?: number;
          requirement_type: string;
          requirement_value: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          icon?: string;
          points_reward?: number;
          requirement_type?: string;
          requirement_value?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting' | 'withdrawal' | 'gift';
          amount: number;
          phone_number: string | null;
          service_id: string | null;
          network: string | null;
          status: 'pending' | 'success' | 'failed';
          reference: string;
          external_reference: string | null;
          description: string | null;
          response_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting' | 'withdrawal' | 'gift';
          amount: number;
          phone_number?: string | null;
          service_id?: string | null;
          network?: string | null;
          status?: 'pending' | 'success' | 'failed';
          reference: string;
          external_reference?: string | null;
          description?: string | null;
          response_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting' | 'withdrawal' | 'gift';
          amount?: number;
          phone_number?: string | null;
          service_id?: string | null;
          network?: string | null;
          status?: 'pending' | 'success' | 'failed';
          reference?: string;
          external_reference?: string | null;
          description?: string | null;
          response_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'credit' | 'debit';
          amount: number;
          description: string | null;
          reference: string | null;
          balance_before: number;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'credit' | 'debit';
          amount: number;
          description?: string | null;
          reference?: string | null;
          balance_before: number;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'credit' | 'debit';
          amount?: number;
          description?: string | null;
          reference?: string | null;
          balance_before?: number;
          balance_after?: number;
          created_at?: string;
        };
      };
      beneficiaries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone_number: string;
          network: string | null;
          service_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone_number: string;
          network?: string | null;
          service_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone_number?: string;
          network?: string | null;
          service_type?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'info' | 'success' | 'warning' | 'error';
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: 'info' | 'success' | 'warning' | 'error';
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'info' | 'success' | 'warning' | 'error';
          is_read?: boolean;
          created_at?: string;
        };
      };
      gift_cards: {
        Row: {
          id: string;
          sender_id: string | null;
          sender_name: string;
          recipient_email: string;
          recipient_phone: string;
          recipient_user_id: string | null;
          service_type: 'airtime' | 'data';
          amount: number;
          network: string | null;
          data_plan_id: string | null;
          occasion: GiftOccasion;
          theme_id: string;
          personal_message: string | null;
          voice_note_url: string | null;
          scheduled_delivery: string | null;
          delivered_at: string | null;
          opened_at: string | null;
          status: GiftStatus;
          transaction_id: string | null;
          inlomax_reference: string | null;
          created_at: string;
          updated_at: string;
          expires_at: string;
          // New columns for retry tracking
          retry_count: number;
          last_error: string | null;
          // New columns for refund/cancellation
          refunded_at: string | null;
          refund_transaction_id: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          // Secure access token
          access_token: string;
        };
        Insert: {
          id?: string;
          sender_id?: string | null;
          sender_name: string;
          recipient_email: string;
          recipient_phone: string;
          recipient_user_id?: string | null;
          service_type: 'airtime' | 'data';
          amount: number;
          network?: string | null;
          data_plan_id?: string | null;
          occasion: GiftOccasion;
          theme_id?: string;
          personal_message?: string | null;
          voice_note_url?: string | null;
          scheduled_delivery?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          status?: GiftStatus;
          transaction_id?: string | null;
          inlomax_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          retry_count?: number;
          last_error?: string | null;
          refunded_at?: string | null;
          refund_transaction_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          access_token?: string;
        };
        Update: {
          id?: string;
          sender_id?: string | null;
          sender_name?: string;
          recipient_email?: string;
          recipient_phone?: string;
          recipient_user_id?: string | null;
          service_type?: 'airtime' | 'data';
          amount?: number;
          network?: string | null;
          data_plan_id?: string | null;
          occasion?: GiftOccasion;
          theme_id?: string;
          personal_message?: string | null;
          voice_note_url?: string | null;
          scheduled_delivery?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          status?: GiftStatus;
          transaction_id?: string | null;
          inlomax_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          retry_count?: number;
          last_error?: string | null;
          refunded_at?: string | null;
          refund_transaction_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          access_token?: string;
        };
      };
      birthday_bonuses: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          amount: number;
          tier: string;
          credited_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          amount: number;
          tier: string;
          credited_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: number;
          amount?: number;
          tier?: string;
          credited_at?: string;
        };
      };
      virtual_accounts: {
        Row: {
          id: string;
          user_id: string;
          account_number: string;
          bank_name: string;
          account_name: string;
          order_ref: string | null;
          flw_ref: string | null;
          is_active: boolean;
          is_temporary: boolean;
          expected_amount: number | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_number: string;
          bank_name: string;
          account_name: string;
          order_ref?: string | null;
          flw_ref?: string | null;
          is_active?: boolean;
          is_temporary?: boolean;
          expected_amount?: number | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_number?: string;
          bank_name?: string;
          account_name?: string;
          order_ref?: string | null;
          flw_ref?: string | null;
          is_active?: boolean;
          is_temporary?: boolean;
          expected_amount?: number | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      withdrawals: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          fee: number | null;
          status: 'pending' | 'success' | 'failed';
          reference: string;
          bank_name: string | null;
          account_number: string | null;
          account_name: string | null;
          failure_reason: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          fee?: number | null;
          status?: 'pending' | 'success' | 'failed';
          reference: string;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          failure_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          fee?: number | null;
          status?: 'pending' | 'success' | 'failed';
          reference?: string;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          failure_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      update_user_balance: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: 'credit' | 'debit';
          p_description?: string;
          p_reference?: string;
        };
        Returns: void;
      };
      process_daily_login: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          streak: number;
          points_earned: number;
          is_new_day: boolean;
        };
      };
      award_loyalty_points: {
        Args: {
          p_user_id: string;
          p_points: number;
          p_type: string;
          p_source: string;
          p_description?: string;
          p_reference_id?: string;
        };
        Returns: void;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type Beneficiary = Database['public']['Tables']['beneficiaries']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];


// ============================================
// SMART FEATURES TYPES
// ============================================

// Scheduled Purchases
export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type ScheduleStatus = 'success' | 'failed' | 'insufficient_balance' | 'service_unavailable' | 'retrying';

export interface ScheduledPurchase {
  id: string;
  user_id: string;
  service_type: 'airtime' | 'data' | 'cable' | 'electricity';
  amount: number;
  recipient_phone: string | null;
  network: string | null;
  data_plan_id: string | null;
  meter_number: string | null;
  smartcard_number: string | null;
  frequency: ScheduleFrequency;
  custom_days: number[] | null;
  preferred_time: string;
  timezone: string;
  smart_timing_enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_status: ScheduleStatus | null;
  last_error: string | null;
  retry_count: number;
  max_retries: number;
  retry_delay_minutes: number;
  success_count: number;
  failure_count: number;
  total_spent: number;
  is_active: boolean;
  paused_at: string | null;
  pause_reason: string | null;
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_before_run: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface ScheduledPurchaseLog {
  id: string;
  scheduled_purchase_id: string;
  status: ScheduleStatus;
  amount: number;
  transaction_id: string | null;
  external_reference: string | null;
  error_message: string | null;
  retry_attempt: number;
  scheduled_for: string;
  executed_at: string;
  created_at: string;
}

// Smart Price Optimizer
export type RecommendationType = 'plan_switch' | 'timing' | 'bundle' | 'savings_tip';

export interface SmartRecommendation {
  id: string;
  user_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  suggested_network: string | null;
  suggested_plan: string | null;
  suggested_amount: number | null;
  potential_savings: number | null;
  savings_percentage: number | null;
  confidence_score: number | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
  accepted_at: string | null;
  dismissed_at: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface UserSpendingPattern {
  id: string;
  user_id: string;
  period_date: string;
  airtime_spent: number;
  data_spent: number;
  cable_spent: number;
  electricity_spent: number;
  data_gb_purchased: number;
  preferred_network: string | null;
  transaction_count: number;
  created_at: string;
}

export interface NetworkPrice {
  id: string;
  network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
  plan_type: 'airtime' | 'data_sme' | 'data_gifting' | 'data_corporate';
  plan_name: string;
  data_amount_mb: number | null;
  validity_days: number | null;
  price: number;
  our_price: number;
  is_promo: boolean;
  promo_ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Gift Cards - Type aliases for convenience (types defined at top of file)
export type GiftCard = Database['public']['Tables']['gift_cards']['Row'];
export type BirthdayBonus = Database['public']['Tables']['birthday_bonuses']['Row'];
