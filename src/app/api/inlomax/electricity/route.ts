import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateMeter, payElectricity, ServiceUnavailableError } from '@/lib/api/inlomax';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serviceID, meterNum, meterType, amount, userId, discoName } = body;

    const useSandbox = process.env.INLOMAX_SANDBOX !== 'false';

    // Verify meter
    if (action === 'verify') {
      if (!serviceID || !meterNum || meterType === undefined) {
        return NextResponse.json(
          { status: false, message: 'Service ID, meter number and type required' },
          { status: 400 }
        );
      }

      // meterType: 1=prepaid, 2=postpaid
      const meterTypeNum = meterType === 'prepaid' ? 1 : 2;

      if (useSandbox) {
        return NextResponse.json({
          status: true,
          message: 'Meter verified (sandbox)',
          data: { customerName: 'Test Customer' }
        });
      }

      const result = await validateMeter({ serviceID, meterNum, meterType: meterTypeNum as 1 | 2 });
      return NextResponse.json({
        status: result.status === 'success',
        message: result.message,
        data: result.data
      });
    }

    // Purchase electricity
    if (!serviceID || !meterNum || !amount || meterType === undefined) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (numAmount < 500 || numAmount > 500000) {
      return NextResponse.json(
        { status: false, message: 'Amount must be between ₦500 and ₦500,000' },
        { status: 400 }
      );
    }


    const meterTypeNum = meterType === 'prepaid' ? 1 : 2;
    const supabase = getSupabaseAdmin();

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('balance').eq('id', userId).single();

      if (profileError || !profile) {
        return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
      }

      if ((profile.balance || 0) < numAmount) {
        return NextResponse.json({ status: false, message: 'Insufficient balance' }, { status: 400 });
      }

      // Generate reference
      const reference = `ELEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'electricity',
          amount: -numAmount,
          status: 'pending',
          reference: reference,
          description: `${discoName || 'Electricity'} (${meterType}) - ${meterNum}`,
        })
        .select().single();

      if (txnError) {
        return NextResponse.json(
          { status: false, message: 'Failed to create transaction: ' + txnError.message },
          { status: 500 }
        );
      }

      try {
        let result;
        if (useSandbox) {
          result = {
            status: 'success' as const,
            message: `Electricity purchase successful (sandbox) - ₦${numAmount}`,
            data: { 
              reference,
              token: '1234-5678-9012-3456-7890',
              customerName: 'Test Customer',
              amount: numAmount,
              amountCharged: numAmount,
              meterNum,
              disco: discoName,
              status: 'success'
            }
          };
        } else {
          result = await payElectricity({
            serviceID,
            meterNum,
            meterType: meterTypeNum as 1 | 2,
            amount: numAmount
          });
        }

        if (result.status === 'success') {
          const newBalance = profile.balance - numAmount;
          
          await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
          await supabase.from('transactions').update({ 
            status: 'success',
            external_reference: result.data?.reference
          }).eq('id', transaction.id);

          return NextResponse.json({
            status: true,
            message: result.message,
            data: { ...result.data, transactionId: transaction.id, newBalance }
          });
        } else {
          await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
          return NextResponse.json({ status: false, message: result.message || 'Purchase failed' });
        }
      } catch (apiError) {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
        throw apiError;
      }
    }

    // No userId - sandbox only
    if (useSandbox) {
      return NextResponse.json({
        status: true,
        message: 'Electricity purchase successful (sandbox)',
        data: {
          reference: 'SANDBOX_' + Date.now(),
          token: '1234-5678-9012-3456-7890',
          meterNum,
          amount: numAmount
        }
      });
    }

    const result = await payElectricity({
      serviceID,
      meterNum,
      meterType: meterTypeNum as 1 | 2,
      amount: numAmount
    });
    return NextResponse.json({
      status: result.status === 'success',
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Electricity purchase error:', error);
    
    // Handle insufficient admin balance gracefully
    if (error instanceof ServiceUnavailableError) {
      return NextResponse.json(
        { status: false, message: 'Service is unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Purchase failed' },
      { status: 500 }
    );
  }
}
