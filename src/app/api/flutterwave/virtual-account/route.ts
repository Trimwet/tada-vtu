import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { calculateBankTransferTotal } from '@/lib/api/flutterwave';

export const dynamic = 'force-dynamic';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

async function flutterwaveRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: object
): Promise<{ status: string; message: string; data?: T }> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) throw new Error('FLUTTERWAVE_SECRET_KEY not configured');

  const response = await fetch(`${FLW_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const result = await response.json();
  return result;
}

// GET - Fetch user's virtual account
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a PERMANENT virtual account (only show permanent accounts)
    const { data: existingAccount, error } = await supabase
      .from('virtual_accounts')
      .select('account_number, bank_name, account_name, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_temporary', false) // CRITICAL: Only return permanent accounts
      .single();

    console.log('Virtual account fetch for user:', user.id, 'Found account:', !!existingAccount, 'Error:', error?.code);

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching virtual account:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch virtual account' },
        { status: 500 }
      );
    }

    if (existingAccount) {
      console.log('Returning permanent virtual account for user:', user.id);
      return NextResponse.json({
        status: 'success',
        data: existingAccount,
      });
    }

    console.log('No permanent virtual account found for user:', user.id);

    return NextResponse.json({
      status: 'success',
      data: null,
      message: 'No virtual account found',
    });
  } catch (error) {
    console.error('Virtual account fetch error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch virtual account' },
      { status: 500 }
    );
  }
}

// POST - Create virtual account for user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, email, phone, firstname, lastname, bvn, amount, account_type = 'permanent' } = body;

    console.log('Virtual account creation request:', {
      user_id, email, phone, firstname, lastname,
      hasBvn: !!bvn, amount, account_type,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    });

    if (!user_id || !email) {
      console.error('Missing required fields:', { user_id, email });
      return NextResponse.json(
        { status: 'error', message: 'User ID and email required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const accountName = `${firstname || 'TADA'} ${lastname || 'User'}`.trim();

    // TEMPORARY ACCOUNT - No BVN required, amount-specific, 1-hour expiry
    if (account_type === 'temporary') {
      if (!amount || amount < 100) {
        return NextResponse.json(
          { status: 'error', message: 'Amount is required for temporary accounts (minimum ₦100)' },
          { status: 400 }
        );
      }

      const txRef = `TADA-TEMP-${user_id.slice(0, 8)}-${Date.now()}`;

      const { totalToTransfer } = calculateBankTransferTotal(amount);

      const flwPayload = {
        email,
        is_permanent: false,
        tx_ref: txRef,
        amount: totalToTransfer,
        firstname: firstname || 'TADA',
        lastname: lastname || 'User',
        narration: 'TADA VTU Wallet Funding',
        ...(phone && { phonenumber: phone }),
      };

      console.log('Flutterwave TEMP VA request:', flwPayload);

      const flwResponse = await flutterwaveRequest<{
        response_code: string;
        response_message: string;
        flw_ref: string;
        order_ref: string;
        account_number: string;
        bank_name: string;
        created_at: string;
        expiry_date: string;
        amount: string;
        note: string;
      }>('/virtual-account-numbers', 'POST', flwPayload);

      console.log('Flutterwave TEMP VA response:', JSON.stringify(flwResponse, null, 2));

      if (flwResponse.status !== 'success' || !flwResponse.data?.account_number) {
        console.error('Failed to create temp virtual account:', flwResponse);
        return NextResponse.json(
          {
            status: 'error',
            message: flwResponse.message || 'Failed to create temporary account',
            details: flwResponse
          },
          { status: 400 }
        );
      }

      const vaData = flwResponse.data;

      // CRITICAL: Save temporary account to database so webhook can find the user
      const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const { error: insertError } = await supabase
        .from('virtual_accounts')
        .insert({
          user_id,
          account_number: vaData.account_number,
          bank_name: vaData.bank_name,
          account_name: `TADA VTU - ${accountName}`,
          order_ref: vaData.order_ref || txRef,
          flw_ref: vaData.flw_ref,
          is_active: true,
          is_temporary: true, // Explicitly set as temporary
          expected_amount: amount,
          expires_at: expiryDate.toISOString(),
        });

      if (insertError) {
        console.error('Failed to save temp virtual account to DB:', insertError);
        // Still continue - account was created with Flutterwave
      } else {
        console.log('Temp virtual account saved to DB for user:', user_id);
      }

      return NextResponse.json({
        status: 'success',
        message: 'Temporary account created',
        data: {
          account_number: vaData.account_number,
          bank_name: vaData.bank_name,
          account_name: `TADA VTU - ${accountName}`,
          amount: vaData.amount,
          expiry_date: vaData.expiry_date,
          note: vaData.note,
          is_temporary: true,
          flw_ref: vaData.flw_ref,
          order_ref: vaData.order_ref,
        },
      });
    }

    // PERMANENT ACCOUNT - Requires BVN (STRICT VALIDATION)
    if (!bvn) {
      console.error('BVN is required for permanent virtual accounts');
      return NextResponse.json(
        { status: 'error', message: 'BVN is required to create a permanent virtual account. Use temporary accounts if you prefer not to provide BVN.' },
        { status: 400 }
      );
    }

    // Validate BVN format strictly
    const bvnRegex = /^\d{11}$/;
    if (!bvnRegex.test(bvn)) {
      console.error('Invalid BVN format provided:', bvn?.length);
      return NextResponse.json(
        { status: 'error', message: 'BVN must be exactly 11 digits' },
        { status: 400 }
      );
    }

    // Additional BVN validation - check for obvious fake numbers
    const invalidBvns = [
      '00000000000', '11111111111', '22222222222', '33333333333', 
      '44444444444', '55555555555', '66666666666', '77777777777',
      '88888888888', '99999999999', '12345678901', '01234567890'
    ];
    
    if (invalidBvns.includes(bvn)) {
      console.error('Invalid/fake BVN provided:', bvn);
      return NextResponse.json(
        { status: 'error', message: 'Please provide a valid BVN' },
        { status: 400 }
      );
    }

    // Check if user already has a permanent virtual account
    const { data: existingAccount, error: existingError } = await supabase
      .from('virtual_accounts')
      .select('account_number, bank_name, account_name')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .eq('is_temporary', false) // Only check for permanent accounts
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing account:', existingError);
    }

    if (existingAccount) {
      return NextResponse.json({
        status: 'success',
        message: 'Virtual account already exists',
        data: {
          ...existingAccount,
          is_temporary: false,
        },
      });
    }

    // Create permanent virtual account with Flutterwave
    const txRef = `TADA-VA-${user_id.slice(0, 8)}-${Date.now()}`;

    const flwPayload = {
      email,
      is_permanent: true,
      bvn, // Required by Flutterwave
      tx_ref: txRef,
      firstname: firstname || 'TADA',
      lastname: lastname || 'User',
      narration: `TADA VTU - ${accountName}`,
      ...(phone && { phonenumber: phone }),
    };

    console.log('Flutterwave PERM VA request payload:', flwPayload);

    const flwResponse = await flutterwaveRequest<{
      response_code: string;
      response_message: string;
      flw_ref: string;
      order_ref: string;
      account_number: string;
      account_status: string;
      bank_name: string;
      created_at: string;
      note: string;
    }>('/virtual-account-numbers', 'POST', flwPayload);

    console.log('Flutterwave PERM VA response:', JSON.stringify(flwResponse, null, 2));

    if (flwResponse.status !== 'success' || !flwResponse.data?.account_number) {
      console.error('Failed to create virtual account:', flwResponse);
      return NextResponse.json(
        {
          status: 'error',
          message: flwResponse.message || 'Failed to create virtual account',
          details: flwResponse
        },
        { status: 400 }
      );
    }

    const vaData = flwResponse.data;

    // Save to database with explicit is_temporary = false
    const { error: insertError } = await supabase
      .from('virtual_accounts')
      .insert({
        user_id,
        account_number: vaData.account_number,
        bank_name: vaData.bank_name,
        account_name: `TADA VTU - ${accountName}`,
        order_ref: vaData.order_ref,
        flw_ref: vaData.flw_ref,
        is_active: true,
        is_temporary: false, // Explicitly set as permanent
        expires_at: null, // Permanent accounts don't expire
      });

    if (insertError) {
      console.error('Failed to save virtual account:', insertError);
      // Still return success since account was created with Flutterwave
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id,
      type: 'success',
      title: 'Virtual Account Created! 🎉',
      message: `Your dedicated account ${vaData.account_number} (${vaData.bank_name}) is ready. Transfer any amount to fund your wallet instantly!`,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Virtual account created successfully',
      data: {
        account_number: vaData.account_number,
        bank_name: vaData.bank_name,
        account_name: `TADA VTU - ${accountName}`,
        note: vaData.note,
        is_temporary: false,
      },
    });
  } catch (error) {
    console.error('Virtual account creation error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create virtual account', error: String(error) },
      { status: 500 }
    );
  }
}
