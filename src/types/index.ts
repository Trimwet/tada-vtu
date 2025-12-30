// Core types for TADA VTU

export type UserRole = 'customer' | 'admin' | 'support';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  walletBalance: number;
  virtualAccountNumber?: string;
  referralCode: string;
  referredBy?: string;
  referralEarnings: number;
  isEmailVerified: boolean;
  darkModePreference: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceType = 'airtime' | 'data' | 'cable' | 'electricity' | 'betting';
export type NetworkProvider = 'MTN' | 'Airtel' | 'Glo' | '9mobile';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TransactionType = 'deposit' | 'purchase' | 'referral_bonus' | 'refund';

export interface Beneficiary {
  id: string;
  userId: string;
  serviceType: ServiceType;
  nickname: string;
  phoneNumber?: string;
  accountNumber?: string;
  provider: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  serviceType?: ServiceType;
  amount: number;
  status: TransactionStatus;
  provider?: string;
  recipient?: string;
  apiReference?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: 'card' | 'virtual_account' | 'bank_transfer';
  paymentReference: string;
  status: TransactionStatus;
  createdAt: Date;
}

export interface MonthlyReport {
  id: string;
  userId: string;
  month: string; // YYYY-MM format
  totalDataPurchased: number; // in GB
  totalSpent: number;
  purchaseCount: number;
  generatedAt: Date;
}

export interface DataPlan {
  id: string;
  network: NetworkProvider;
  name: string;
  size: string; // e.g., "1GB", "2GB"
  validity: string; // e.g., "30 days"
  price: number;
  type: 'sme' | 'gifting' | 'corporate';
}
