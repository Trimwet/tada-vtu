import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseAirtime, purchaseData } from '@/lib/api/inlomax';
import { getThemeById } from '@/lib/gift-cards';
import crypto from 'crypto';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Generate idempotency key for this request
function generateIdempotencyKey(giftId: string, phone: string): string {
  const data = `${giftId}-${phone}-${Math.floor(Date.now() / 60000)}`; // 1-minute window
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// POST - Open gift and credit to recipient
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: giftId } = await params;
    const body = await request.json();
    const { recipientPhone, recipientEmail, userId, idempotencyKey: clientKey } = body;

    if (!giftId) {
      return NextResponse.json({ status: false, message: 'Gift ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get gift details
    const { data: gift, error: giftError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftId)
      .single();

    if (giftError || !gift) {
      return NextResponse.json({ status: false, message: 'Gift not found' }, { status: 404 });
    }

    // ============================================
    // RECIPIENT VERIFICATION - Only the right person can open
    // ============================================
    
    // Check if gift was already opened/credited (one-time only)
    if (gift.status === 'credited') {
      return NextResponse.json({
        status: false,
        message: 'This gift has already been claimed',
        data: { alreadyClaimed: true },
      }, { status: 400 });
    }

    // Verify recipient by email OR phone OR user ID
    let isAuthorizedRecipient = false;
    
    // Method 1: Verify by user ID (if recipient is a TADA user)
    if (userId && gift.recipient_user_id) {
      isAuthorizedRecipient = userId === gift.recipient_user_id;
    }
    
    // Method 2: Verify by email
    if (!isAuthorizedRecipient && recipientEmail) {
      isAuthorizedRecipient = recipientEmail.toLowerCase() === gift.recipient_email.toLowerCase();
    }
    
    // Method 3: Verify by phone number
    if (!isAuthorizedRecipient && recipientPhone) {
      // Normalize phone numbers for comparison
      const normalizedInput = recipientPhone.replace(/\D/g, '').slice(-10);
      const normalizedGift = gift.recipient_phone.replace(/\D/g, '').slice(-10);
      isAuthorizedRecipient = normalizedInput === normalizedGift;
    }

    // If no verification provided, check if user's email matches
    if (!isAuthorizedRecipient && userId) {
      const { data: user } = await supabase
        .from('profiles')
        .select('email, phone_number')
        .eq('id', userId)
        .single();
      
      if (user) {
        if (user.email && user.email.toLowerCase() === gift.recipient_email.toLowerCase()) {
          isAuthorizedRecipient = true;
        }
        if (user.phone_number) {
          const normalizedUserPhone = user.phone_number.replace(/\D/g, '').slice(-10);
          const normalizedGiftPhone = gift.recipient_phone.replace(/\D/g, '').slice(-10);
          if (normalizedUserPhone === normalizedGiftPhone) {
            isAuthorizedRecipient = true;
          }
        }
      }
    }

    if (!isAuthorizedRecipient) {
      return NextResponse.json({
        status: false,
        message: 'This gift was sent to someone else. Please verify your email or phone number.',
        data: { unauthorized: true },
      }, { status: 403 });
    }

    // ============================================
    // STATUS CHECKS
    // ============================================

    // If currently crediting, return processing status
    if (gift.status === 'crediting') {
      return NextResponse.json({
        status: false,
        message: 'Gift is being processed. Please wait...',
        data: { processing: true },
      }, { status: 202 });
    }

    if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) {
      await supabase.from('gift_cards').update({ status: 'expired' }).eq('id', giftId);
      return NextResponse.json({
        status: false,
        message: 'This gift has expired',
      }, { status: 410 });
    }

    if (gift.status === 'cancelled') {
      return NextResponse.json({
        status: false,
        message: 'This gift has been cancelled',
      }, { status: 400 });
    }

    // Use the gift's recipient phone for delivery
    const targetPhone = gift.recipient_phone;
    
    // Validate phone format
    if (!/^0[789][01]\d{8}$/.test(targetPhone)) {
      return NextResponse.json({
        status: false,
        message: 'Invalid recipient phone number',
      }, { status: 400 });
    }

    // Check retry count (max 3 attempts)
    const retryCount = gift.retry_count || 0;
    const MAX_RETRIES = 3;
    
    if (retryCount >= MAX_RETRIES && gift.status === 'opened') {
      return NextResponse.json({
        status: false,
        message: 'Maximum retry attempts reached. Please contact support.',
        data: { giftId, retryCount },
      }, { status: 400 });
    }

    // Generate idempotency key
    const idempotencyKey = clientKey || generateIdempotencyKey(giftId, targetPhone);

    // ATOMIC: Try to transition to crediting status
    const { data: creditingResult } = await supabase.rpc('start_gift_crediting', {
      p_gift_id: giftId,
      p_idempotency_key: idempotencyKey,
    });

    // Check if atomic transition succeeded
    if (creditingResult && creditingResult.length > 0) {
      const result = creditingResult[0];
      if (!result.success && result.gift_status !== 'credited') {
        return NextResponse.json({
          status: false,
          message: result.message || 'Cannot process gift at this time',
        }, { status: 400 });
      }
      // If already credited, return success
      if (result.gift_status === 'credited') {
        const theme = getThemeById(gift.theme_id);
        return NextResponse.json({
          status: true,
          message: 'Gift already claimed!',
          data: {
            amount: gift.amount,
            serviceType: gift.service_type,
            senderName: gift.sender_name,
            personalMessage: gift.personal_message,
            occasion: gift.occasion,
            theme: theme || { animation: 'confetti', primaryColor: '#22C55E' },
            reference: gift.inlomax_reference,
            alreadyClaimed: true,
          },
        });
      }
    } else {
      // Fallback: Use traditional update if RPC not available
      await supabase
        .from('gift_cards')
        .update({
          status: 'crediting',
          opened_at: gift.opened_at || new Date().toISOString(),
          retry_count: retryCount + 1,
          last_error: null,
        })
        .eq('id', giftId)
        .in('status', ['delivered', 'opened']);
    }

    // Execute the actual purchase
    let purchaseResult: { status: string; message: string; data?: { reference?: string } };
    const reference = `GIFT_${giftId}_${Date.now()}`;

    try {
      if (gift.service_type === 'airtime') {
        // Detect network from phone number or use stored network
        const network = gift.network || detectNetwork(targetPhone);
        
        purchaseResult = await purchaseAirtime({
          network,
          phone: targetPhone,
          amount: gift.amount,
        });
      } else if (gift.service_type === 'data') {
        if (!gift.data_plan_id) {
          // Default to airtime if no data plan specified
          const network = gift.network || detectNetwork(targetPhone);
          purchaseResult = await purchaseAirtime({
            network,
            phone: targetPhone,
            amount: gift.amount,
          });
        } else {
          // Use the data_plan_id as serviceID for Inlomax
          purchaseResult = await purchaseData({
            serviceID: gift.data_plan_id,
            phone: targetPhone,
          });
        }
      } else {
        purchaseResult = { status: 'failed', message: 'Unsupported gift type' };
      }

      if (purchaseResult.status === 'success' || purchaseResult.status === 'processing') {
        // Create transaction record
        await supabase.from('transactions').insert({
          user_id: gift.sender_id,
          type: gift.service_type,
          amount: -gift.amount,
          status: 'success',
          reference,
          external_reference: purchaseResult.data?.reference,
          phone_number: targetPhone,
          network: gift.network,
          description: `Gift ${gift.service_type} - ${gift.occasion}`,
        });

        // ATOMIC: Complete crediting
        const { data: completeResult } = await supabase.rpc('complete_gift_crediting', {
          p_gift_id: giftId,
          p_inlomax_reference: purchaseResult.data?.reference || null,
          p_transaction_id: reference,
        });

        // Fallback if RPC not available
        if (!completeResult) {
          await supabase
            .from('gift_cards')
            .update({
              status: 'credited',
              inlomax_reference: purchaseResult.data?.reference,
              transaction_id: reference,
            })
            .eq('id', giftId);
        }

        // Notify sender
        if (gift.sender_id) {
          await supabase.from('notifications').insert({
            user_id: gift.sender_id,
            title: '🎉 Gift Opened!',
            message: `Your gift to ${targetPhone} has been opened and claimed!`,
            type: 'success',
          });
        }

        // Get theme for response
        const theme = getThemeById(gift.theme_id);

        return NextResponse.json({
          status: true,
          message: 'Gift claimed successfully!',
          data: {
            amount: gift.amount,
            serviceType: gift.service_type,
            senderName: gift.sender_name,
            personalMessage: gift.personal_message,
            voiceNoteUrl: gift.voice_note_url,
            occasion: gift.occasion,
            theme: theme || { animation: 'confetti', primaryColor: '#22C55E' },
            reference: purchaseResult.data?.reference,
          },
        });

      } else {
        // Purchase failed - use atomic fail function
        const errorMsg = purchaseResult.message || 'Failed to credit gift';
        
        const { data: failResult } = await supabase.rpc('fail_gift_crediting', {
          p_gift_id: giftId,
          p_error_message: errorMsg,
        });

        let canRetry = true;
        let remainingRetries = MAX_RETRIES - (retryCount + 1);

        if (failResult && failResult.length > 0) {
          canRetry = failResult[0].can_retry;
          remainingRetries = failResult[0].remaining_retries;
        } else {
          // Fallback if RPC not available
          await supabase
            .from('gift_cards')
            .update({ 
              status: 'opened',
              last_error: errorMsg,
            })
            .eq('id', giftId);
        }

        return NextResponse.json({
          status: false,
          message: canRetry 
            ? `${errorMsg}. You have ${remainingRetries} retry attempt(s) left.`
            : `${errorMsg}. Please contact support.`,
          data: { canRetry, remainingRetries },
        }, { status: 500 });
      }

    } catch (purchaseError) {
      console.error('Gift purchase error:', purchaseError);
      
      // Use atomic fail function
      const errorMsg = purchaseError instanceof Error ? purchaseError.message : 'Unknown error';
      
      const { data: failResult } = await supabase.rpc('fail_gift_crediting', {
        p_gift_id: giftId,
        p_error_message: `Service error: ${errorMsg}`,
      });

      let canRetry = true;
      let remainingRetries = MAX_RETRIES - (retryCount + 1);

      if (failResult && failResult.length > 0) {
        canRetry = failResult[0].can_retry;
        remainingRetries = failResult[0].remaining_retries;
      } else {
        // Fallback if RPC not available
        await supabase
          .from('gift_cards')
          .update({ 
            status: 'opened',
            last_error: `Service error: ${errorMsg}`,
          })
          .eq('id', giftId);
      }

      return NextResponse.json({
        status: false,
        message: canRetry
          ? `Service temporarily unavailable. You have ${remainingRetries} retry attempt(s) left.`
          : 'Service unavailable. Please contact support.',
        data: { canRetry, remainingRetries },
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Gift open error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// Helper to detect network from phone number
function detectNetwork(phone: string): string {
  const prefix = phone.substring(0, 4);
  
  const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
  const airtelPrefixes = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0907', '0912'];
  const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
  const nineMobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];

  if (mtnPrefixes.includes(prefix)) return 'MTN';
  if (airtelPrefixes.includes(prefix)) return 'AIRTEL';
  if (gloPrefixes.includes(prefix)) return 'GLO';
  if (nineMobilePrefixes.includes(prefix)) return '9MOBILE';
  
  return 'MTN'; // Default fallback
}
