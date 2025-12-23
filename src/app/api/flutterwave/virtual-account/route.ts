import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
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
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { status: 'error', message: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user already has a virtual account
    const { data: existingAccount, error } = await supabase
      .from('virtual_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching virtual account:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch virtual account' },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json({
        status: 'success',
        data: {
          account_number: existingAccount.account_number,
          bank_name: existingAccount.bank_name,
          account_name: existingAccount.account_name,
          created_at: existingAccount.created_at,
        },
      });
    }

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
      hasBvn: !!bvn, amount, account_type 
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
      
      const flwPayload = {
        email,
        is_permanent: false,
        tx_ref: txRef,
        amount: amount + 20, // Add ₦20 buffer for fees
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

    // PERMANENT ACCOUNT - Requires BVN
    if (!bvn || bvn.length !== 11) {
      console.error('BVN required but not provided or invalid');
      return NextResponse.json(
        { status: 'error', message: 'A valid 11-digit BVN is required to create a permanent virtual account' },
        { status: 400 }
      );
    }

    // Check if user already has a permanent virtual account
    const { data: existingAccount } = await supabase
      .from('virtual_accounts')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (existingAccount) {
      return NextResponse.json({
        status: 'success',
        message: 'Virtual account already exists',
        data: {
          account_number: existingAccount.account_number,
          bank_name: existingAccount.bank_name,
          account_name: existingAccount.account_name,
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

    // Save to database
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
