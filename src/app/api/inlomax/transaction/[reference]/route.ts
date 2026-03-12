import { NextRequest, NextResponse } from 'next/server';
import { getTransaction } from '@/lib/api/inlomax';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Transaction reference is required' 
        },
        { status: 400 }
      );
    }

    // Get transaction from Inlomax
    const inlomaxTransaction = await getTransaction(reference);
    
    // Get our local transaction
    const supabase = getSupabaseAdmin();
    const { data: localTransaction, error: localError } = await supabase
      .from('transactions')
      .select('*, profiles!inner(balance)')
      .eq('external_reference', reference)
      .single();

    if (localError || !localTransaction) {
      return NextResponse.json({
        status: 'error',
        message: 'Local transaction not found',
        inlomax: inlomaxTransaction
      });
    }

    // Check if status needs updating
    const inlomaxStatus = inlomaxTransaction.data?.status;
    const localStatus = localTransaction.status;

    if (inlomaxStatus && inlomaxStatus !== localStatus) {
      console.log(`[VERIFY] Status mismatch for ${reference}: Local=${localStatus}, Inlomax=${inlomaxStatus}`);
      
      // Update local transaction status
      const updateData: any = {
        status: inlomaxStatus === 'success' ? 'success' : 'failed',
        updated_at: new Date().toISOString(),
        response_data: {
          ...localTransaction.response_data,
          inlomax_verification: inlomaxTransaction.data,
          verified_at: new Date().toISOString()
        }
      };

      // If Inlomax shows failed/refunded but we have it as pending, refund the user
      if ((inlomaxStatus === 'failed' || inlomaxStatus === 'refunded') && localStatus === 'pending') {
        const refundAmount = Math.abs(localTransaction.amount);
        
        // Update user balance
        await supabase
          .from('profiles')
          .update({ 
            balance: localTransaction.profiles.balance + refundAmount 
          })
          .eq('id', localTransaction.user_id);

        // Create refund wallet transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: localTransaction.user_id,
            type: 'credit',
            amount: refundAmount,
            description: `Refund for failed transaction - ${reference}`,
            reference: `REFUND_${reference}`,
            balance_before: localTransaction.profiles.balance,
            balance_after: localTransaction.profiles.balance + refundAmount
          });

        updateData.response_data.refunded = true;
        updateData.response_data.refund_amount = refundAmount;
      }

      // Update the transaction
      await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', localTransaction.id);

      return NextResponse.json({
        status: 'updated',
        message: `Transaction status updated from ${localStatus} to ${updateData.status}`,
        local: { ...localTransaction, status: updateData.status },
        inlomax: inlomaxTransaction,
        refunded: updateData.response_data?.refunded || false
      });
    }

    return NextResponse.json({
      status: 'verified',
      message: 'Transaction status is in sync',
      local: localTransaction,
      inlomax: inlomaxTransaction
    });

  } catch (error) {
    console.error('Error verifying Inlomax transaction:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to verify transaction' 
      },
      { status: 500 }
    );
  }
}
