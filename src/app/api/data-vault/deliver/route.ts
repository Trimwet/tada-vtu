import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultId, userId } = body;

    if (!vaultId || !userId) {
      return NextResponse.json(
        { status: false, message: 'Vault ID and User ID are required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`vault-deliver:${identifier}`, RATE_LIMITS.transaction);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get vault item
    const { data: vaultItem, error: vaultError } = await supabase
      .from('data_vault')
      .select('*')
      .eq('id', vaultId)
      .eq('user_id', userId)
      .single();

    if (vaultError || !vaultItem) {
      console.error('Vault item fetch error:', vaultError);
      return NextResponse.json(
        { status: false, message: 'Vault item not found' },
        { status: 404 }
      );
    }

    // Check if item is ready for delivery
    if (vaultItem.status !== 'ready') {
      return NextResponse.json(
        { status: false, message: `This item has already been ${vaultItem.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(vaultItem.expires_at) < new Date()) {
      return NextResponse.json(
        { status: false, message: 'This vault item has expired and will be refunded automatically' },
        { status: 400 }
      );
    }

    try {
      // Call Inlomax API to deliver the data
      console.log(`[DATA-VAULT] Delivering: ${vaultItem.network} ${vaultItem.plan_name} to ${vaultItem.recipient_phone}`);

      const result = await purchaseDataInlomax({ 
        serviceID: vaultItem.plan_id, 
        phone: vaultItem.recipient_phone 
      });

      console.log(`[DATA-VAULT] Inlomax response:`, result.status, result.message);

      if (result.status === 'success') {
        // Mark vault item as delivered
        const { error: updateError } = await supabase
          .from('data_vault')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            delivery_reference: result.data?.reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vaultId);

        if (updateError) {
          console.error('Vault update error:', updateError);
        }

        // Create a new transaction record for the delivery
        const deliveryReference = `VAULT_DELIVERY_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'data',
            amount: 0, // No additional charge since already paid
            status: 'success',
            reference: deliveryReference,
            phone_number: vaultItem.recipient_phone,
            network: vaultItem.network,
            description: `Data Delivered: ${vaultItem.plan_name} - ${vaultItem.recipient_phone}`,
            external_reference: result.data?.reference,
          });

        // Create success notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Data Delivered!',
            message: `${vaultItem.plan_name} has been successfully delivered to ${vaultItem.recipient_phone}`,
            type: 'success',
          });

        return NextResponse.json({
          status: true,
          message: `${vaultItem.plan_name} delivered to ${vaultItem.recipient_phone} successfully!`,
          data: {
            vaultId: vaultItem.id,
            deliveryReference,
            externalReference: result.data?.reference,
            network: vaultItem.network,
            phone: vaultItem.recipient_phone,
            planName: vaultItem.plan_name,
            amount: vaultItem.amount,
            deliveredAt: new Date().toISOString(),
          },
        });

      } else if (result.status === 'processing') {
        // Mark as processing - we'll need a webhook or cron to check status later
        await supabase
          .from('data_vault')
          .update({
            status: 'delivered', // Optimistically mark as delivered for now
            delivered_at: new Date().toISOString(),
            delivery_reference: result.data?.reference,
            metadata: { ...vaultItem.metadata, processing: true },
          })
          .eq('id', vaultId);

        return NextResponse.json({
          status: true,
          message: 'Data delivery is processing. You will be notified when complete.',
          data: {
            vaultId: vaultItem.id,
            status: 'processing',
            externalReference: result.data?.reference,
          },
        });

      } else {
        // Delivery failed - keep vault item ready for retry
        console.error('[DATA-VAULT] Delivery failed:', result.message);

        // Create failure notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Data Delivery Failed',
            message: `Failed to deliver ${vaultItem.plan_name} to ${vaultItem.recipient_phone}. You can try again.`,
            type: 'error',
          });

        return NextResponse.json({
          status: false,
          message: result.message || 'Data delivery failed. Please try again.',
        });
      }

    } catch (apiError) {
      console.error('[DATA-VAULT] API Error:', apiError);

      // Handle service unavailable gracefully
      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      const errorMessage = apiError instanceof Error ? apiError.message : 'Service temporarily unavailable';
      return NextResponse.json(
        { status: false, message: errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[DATA-VAULT] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}