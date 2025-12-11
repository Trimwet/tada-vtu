import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseAirtime } from '@/lib/api/inlomax';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { phone, network, amount } = await request.json();

    // Validate inputs
    if (!phone || !network || !amount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^0\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
    }

    if (amount < 100) {
      return NextResponse.json({ success: false, error: 'Minimum withdrawal is ₦100' }, { status: 400 });
    }

    const withdrawAmount = Math.min(amount, 500); // Max ₦500 per withdrawal

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    const supabase = getSupabaseAdmin();
    
    // Get user session from cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...val] = c.split('=');
        return [key, val.join('=')];
      })
    );
    
    // Try to get user from Supabase auth
    const { createServerClient } = await import('@supabase/ssr');
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies[name];
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if ((profile.balance || 0) < withdrawAmount) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 });
    }

    // Map network names to Inlomax format
    const networkMap: Record<string, string> = {
      'MTN': 'mtn',
      'GLO': 'glo',
      'AIRTEL': 'airtel',
      '9MOBILE': '9mobile',
    };

    const inlomaxNetwork = networkMap[network.toUpperCase()] || network.toLowerCase();

    // Purchase airtime via Inlomax
    const reference = `REF_WITHDRAW_${Date.now()}_${user.id.slice(0, 8)}`;
    
    try {
      const airtimeResult = await purchaseAirtime({
        network: inlomaxNetwork,
        phone,
        amount: withdrawAmount,
      });

      if (airtimeResult.status !== 'success' && airtimeResult.status !== 'processing') {
        throw new Error(airtimeResult.message || 'Airtime purchase failed');
      }

      // Deduct from user balance
      const newBalance = (profile.balance || 0) - withdrawAmount;
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'airtime',
        amount: -withdrawAmount,
        status: 'success',
        description: `Referral earnings withdrawal - ${network} airtime to ${phone}`,
        reference,
        phone_number: phone,
        network: inlomaxNetwork,
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'Airtime Sent! 🎉',
        message: `₦${withdrawAmount} ${network} airtime has been sent to ${phone}`,
      });

      return NextResponse.json({
        success: true,
        amount: withdrawAmount,
        phone,
        network,
        message: 'Airtime sent successfully!',
      });

    } catch (airtimeError: unknown) {
      console.error('Airtime purchase error:', airtimeError);
      const errorMessage = airtimeError instanceof Error ? airtimeError.message : 'Airtime purchase failed';
      
      // Check if it's a service unavailable error
      if (errorMessage.includes('unavailable') || errorMessage.includes('insufficient')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Service temporarily unavailable. Please try again later.' 
        }, { status: 503 });
      }
      
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }

  } catch (error) {
    console.error('Referral withdrawal error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process withdrawal' }, { status: 500 });
  }
}
