import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCable, purchaseCable, ServiceUnavailableError } from '@/lib/api/inlomax';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serviceID, iucNum, amount, planName, userId } = body;

    const useSandbox = process.env.INLOMAX_SANDBOX !== 'false';

    // Verify IUC number
    if (action === 'verify') {
      if (!serviceID || !iucNum) {
        return NextResponse.json(
          { status: false, message: 'Service ID and IUC number required' },
          { status: 400 }
        );
      }

      if (useSandbox) {
        return NextResponse.json({
          status: true,
          message: 'IUC verified (sandbox)',
          data: { customerName: 'Test Customer', currentBouquet: 'UNKNOWN' }
        });
      }

      const result = await validateCable({ serviceID, iucNum });
      return NextResponse.json({
        status: result.status === 'success',
        message: result.message,
        data: result.data
      });
    }

    // Purchase subscription
    if (!serviceID || !iucNum) {
      return NextResponse.json(
        { status: false, message: 'Service ID and IUC number required' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount) || 0;
    const supabase = getSupabaseAdmin();


    if (userId && numAmount > 0) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('balance').eq('id', userId).single();

      if (profileError || !profile) {
        return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
      }

      if ((profile.balance || 0) < numAmount) {
        return NextResponse.json({ status: false, message: 'Insufficient balance' }, { status: 400 });
      }

      // Generate reference
      const reference = `CABLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'cable',
          amount: -numAmount,
          status: 'pending',
          reference: reference,
          description: `Cable TV ${planName || serviceID} - ${iucNum}`,
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
            message: `Cable subscription successful (sandbox) - ${planName || serviceID}`,
            data: { reference, iucNum, cable: planName, status: 'success' }
          };
        } else {
          result = await purchaseCable({ serviceID, iucNum });
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
        message: 'Cable subscription successful (sandbox)',
        data: { reference: 'SANDBOX_' + Date.now(), iucNum, cable: planName }
      });
    }

    const result = await purchaseCable({ serviceID, iucNum });
    return NextResponse.json({
      status: result.status === 'success',
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Cable purchase error:', error);
    
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
