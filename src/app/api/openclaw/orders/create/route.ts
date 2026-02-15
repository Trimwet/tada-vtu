// OpenClaw Order Creation Endpoint
// Creates a pending order record for data purchase

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
  normalizeNigerianPhone,
  isValidNigerianPhone,
} from '@/lib/openclaw-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const SUPPORTED_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const;
type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

interface OrderCreateRequest {
  userId: string;
  phone: string;
  network: string;
  planId: string;
  planName: string;
  amount: number;
  source: 'whatsapp' | 'telegram';
}

async function handler(request: NextRequest) {
  try {
    // Parse request body
    const body: OrderCreateRequest = await request.json();

    const { userId, phone, network, planId, planName, amount, source } = body;

    // Validate required fields
    if (!userId || !phone || !network || !planId || !planName || !amount) {
      return NextResponse.json(
        openclawError(
          'Missing required fields: userId, phone, network, planId, planName, amount',
          'MISSING_FIELDS'
        ),
        { status: 400 }
      );
    }

    // Validate phone number
    if (!isValidNigerianPhone(phone)) {
      return NextResponse.json(
        openclawError(
          'Invalid phone number format. Please use Nigerian format (e.g., 0903837261)',
          'INVALID_PHONE'
        ),
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeNigerianPhone(phone)!;

    // Validate network
    const upperNetwork = network.toUpperCase() as SupportedNetwork;
    if (!SUPPORTED_NETWORKS.includes(upperNetwork)) {
      return NextResponse.json(
        openclawError(
          `Unsupported network. Supported networks: ${SUPPORTED_NETWORKS.join(', ')}`,
          'INVALID_NETWORK'
        ),
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 50000) {
      return NextResponse.json(
        openclawError(
          'Invalid amount. Must be between ₦1 and ₦50,000',
          'INVALID_AMOUNT'
        ),
        { status: 400 }
      );
    }

    // Rate limiting - check for purchase rate limit
    const purchaseRateLimit = checkRateLimit(
      `openclaw:purchase:${userId}`,
      RATE_LIMITS.openclawPurchase
    );

    if (!purchaseRateLimit.allowed) {
      return NextResponse.json(
        openclawError(
          `Purchase limit exceeded. Try again in ${Math.ceil(purchaseRateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Get user profile and check balance
    type ProfileData = {
      id: string;
      balance: number;
      is_active: boolean;
      full_name: string | null;
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance, is_active, full_name')
      .eq('id', userId)
      .single<ProfileData>();

    if (profileError || !profile) {
      console.error('[OPENCLAW ORDER CREATE] Profile error:', profileError);
      return NextResponse.json(
        openclawError('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if account is active
    if (!profile.is_active) {
      return NextResponse.json(
        openclawError(
          'Account is inactive. Please contact support.',
          'ACCOUNT_INACTIVE'
        ),
        { status: 403 }
      );
    }

    // Check balance
    const currentBalance = profile.balance || 0;
    if (currentBalance < amount) {
      return NextResponse.json(
        openclawError(
          `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, need ₦${amount.toLocaleString()}`,
          'INSUFFICIENT_BALANCE'
        ),
        { status: 400 }
      );
    }

    // Check for duplicate orders (same user, phone, network, plan within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    type RecentOrderData = {
      id: string;
      reference: string;
      status: string;
    };

    const { data: recentOrders } = await supabase
      .from('transactions')
      .select('id, reference, status')
      .eq('user_id', userId)
      .eq('phone_number', normalizedPhone)
      .eq('network', upperNetwork)
      .eq('type', 'data')
      .gte('created_at', fiveMinutesAgo)
      .in('status', ['pending', 'success'])
      .returns<RecentOrderData[]>();

    if (recentOrders && recentOrders.length > 0) {
      const existingOrder = recentOrders[0];
      return NextResponse.json(
        openclawError(
          `Duplicate order detected. Recent order: ${existingOrder.reference}`,
          'DUPLICATE_ORDER'
        ),
        { status: 409 }
      );
    }

    // Generate unique reference
    const reference = `OC_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create pending transaction
    type TransactionData = {
      id: string;
      reference: string;
      created_at: string;
    };

    type TransactionInsert = {
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
    };

    const insertData: TransactionInsert = {
      user_id: userId,
      type: 'data',
      amount: -amount,
      status: 'pending',
      reference,
      phone_number: normalizedPhone,
      network: upperNetwork,
      service_id: planId,
      description: `${upperNetwork} ${planName} - ${normalizedPhone} (OpenClaw)`,
      response_data: {
        source: source || 'whatsapp',
        planId,
        planName,
      },
    };

    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert(insertData as any)
      .select('id, reference, created_at')
      .single<TransactionData>();

    if (txnError || !transaction) {
      console.error('[OPENCLAW ORDER CREATE] Transaction error:', txnError);
      return NextResponse.json(
        openclawError(
          'Failed to create order. Please try again.',
          'ORDER_CREATE_FAILED'
        ),
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json(
      openclawSuccess({
        orderId: transaction.id,
        reference: transaction.reference,
        status: 'pending',
        amount,
        network: upperNetwork,
        phone: normalizedPhone,
        planName,
        createdAt: transaction.created_at,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('[OPENCLAW ORDER CREATE] Unexpected error:', error);
    return NextResponse.json(
      openclawError(
        'An unexpected error occurred',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
}

export const POST = withOpenClawAuth(handler);
