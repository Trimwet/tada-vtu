export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

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
          type: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting';
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
          type: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting';
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
          type?: 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting';
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
