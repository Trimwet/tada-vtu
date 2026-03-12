import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const apiSecret = request.headers.get('x-api-secret');

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'API key and secret are required',
          },
        },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify API credentials
    console.log('Checking API key:', apiKey);
    console.log('Checking API secret:', apiSecret);
    
    const { data: keyData, error: keyError } = await supabase
      .from('reseller_api_keys')
      .select('*, profiles!inner(balance)')
      .eq('api_key', apiKey)
      .eq('api_secret', apiSecret)
      .eq('is_active', true)
      .single();

    console.log('Key data:', keyData);
    console.log('Key error:', keyError);

    if (keyError || !keyData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or inactive API credentials',
          },
        },
        { status: 401 }
      );
    }

    // Get balance from profiles
    const balance = (keyData as unknown as { profiles: { balance: number } }).profiles?.balance || 0;

    return NextResponse.json({
      success: true,
      data: {
        balance: balance,
        currency: 'NGN',
      },
    });
  } catch (error) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking balance',
        },
      },
      { status: 500 }
    );
  }
}
