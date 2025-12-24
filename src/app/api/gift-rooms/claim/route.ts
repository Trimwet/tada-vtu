import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ClaimGiftRequest, ClaimGiftResponse } from '@/types/gift-room';

export async function POST(request: NextRequest): Promise<NextResponse<ClaimGiftResponse>> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign up or log in to claim your gift.'
      }, { status: 401 });
    }

    // Parse request body
    const body: ClaimGiftRequest = await request.json();
    const { reservation_id } = body;

    // Validate input
    if (!reservation_id) {
      return NextResponse.json({
        success: false,
        error: 'Reservation ID is required'
      }, { status: 400 });
    }

    // Get reservation details to validate
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        room:gift_rooms (
          id,
          sender_id,
          amount,
          status,
          expires_at
        )
      `)
      .eq('id', reservation_id)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json({
        success: false,
        error: 'Reservation not found'
      }, { status: 404 });
    }

    // Check if reservation is still active
    if ((reservation as any).status !== 'active') {
      if ((reservation as any).status === 'claimed') {
        return NextResponse.json({
          success: false,
          error: 'This gift has already been claimed'
        }, { status: 400 });
      }
      return NextResponse.json({
        success: false,
        error: 'This reservation is no longer valid'
      }, { status: 400 });
    }

    // Check if reservation has expired
    const now = new Date();
    const reservationExpiry = new Date((reservation as any).expires_at);
    if (reservationExpiry < now) {
      return NextResponse.json({
        success: false,
        error: 'This reservation has expired'
      }, { status: 400 });
    }

    // Check if gift room is still valid
    if (!(reservation as any).room || (reservation as any).room.status === 'expired') {
      return NextResponse.json({
        success: false,
        error: 'This gift room has expired'
      }, { status: 400 });
    }

    // Prevent self-claiming (sender cannot claim their own gift)
    if ((reservation as any).room.sender_id === user.id) {
      return NextResponse.json({
        success: false,
        error: 'You cannot claim your own gift'
      }, { status: 400 });
    }

    // Check if user already claimed a gift from this room
    const { data: existingClaim } = await supabase
      .from('gift_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('reservation_id', reservation_id)
      .single();

    if (existingClaim) {
      return NextResponse.json({
        success: false,
        error: 'You have already claimed this gift'
      }, { status: 400 });
    }

    // Claim gift using database function
    const { data: claimId, error: claimError } = await supabase
      .rpc('claim_gift', {
        p_reservation_id: reservation_id,
        p_user_id: user.id
      } as any);

    if (claimError) {
      console.error('Error claiming gift:', claimError);
      
      // Handle specific errors
      if (claimError.message.includes('already claimed')) {
        return NextResponse.json({
          success: false,
          error: 'This gift has already been claimed'
        }, { status: 400 });
      }

      if (claimError.message.includes('no longer active')) {
        return NextResponse.json({
          success: false,
          error: 'This reservation is no longer valid'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to claim gift. Please try again.'
      }, { status: 500 });
    }

    // Get claim details
    const { data: claimDetails, error: claimFetchError } = await supabase
      .from('gift_claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimFetchError || !claimDetails) {
      console.error('Error fetching claim details:', claimFetchError);
      return NextResponse.json({
        success: false,
        error: 'Gift claimed but failed to retrieve details'
      }, { status: 500 });
    }

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Log the claim activity
    await supabase
      .from('gift_room_activities')
      .insert({
        room_id: (reservation as any).room.id,
        user_id: user.id,
        activity_type: 'claimed',
        details: {
          claim_id: claimId,
          amount: (claimDetails as any).amount,
          referral_bonus_awarded: (claimDetails as any).referral_bonus_awarded
        },
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || 'unknown'
      } as any);

    return NextResponse.json({
      success: true,
      data: {
        claim_id: (claimDetails as any).id,
        amount: (claimDetails as any).amount,
        referral_bonus_awarded: (claimDetails as any).referral_bonus_awarded
      }
    });

  } catch (error) {
    console.error('Unexpected error in gift claim:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}