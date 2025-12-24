import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateGiftRoomRequest, CreateGiftRoomResponse, GIFT_ROOM_LIMITS, validateGiftRoomCapacity, validateGiftAmount } from '@/types/gift-room';

export async function POST(request: NextRequest): Promise<NextResponse<CreateGiftRoomResponse>> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request body
    const body: CreateGiftRoomRequest = await request.json();
    const { type, capacity, amount, message, expiration_hours = 48 } = body;

    // Validate input
    if (!type || !capacity || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type, capacity, amount'
      }, { status: 400 });
    }

    // Validate gift room type and capacity
    if (!validateGiftRoomCapacity(type, capacity)) {
      const limits = GIFT_ROOM_LIMITS[type];
      return NextResponse.json({
        success: false,
        error: `Invalid capacity for ${type} gift. Must be between ${limits.min} and ${limits.max}`
      }, { status: 400 });
    }

    // Validate amount
    if (!validateGiftAmount(amount)) {
      return NextResponse.json({
        success: false,
        error: 'Gift amount must be between ₦50 and ₦50,000'
      }, { status: 400 });
    }

    // Validate expiration hours
    if (expiration_hours < 1 || expiration_hours > 168) { // Max 1 week
      return NextResponse.json({
        success: false,
        error: 'Expiration hours must be between 1 and 168 (1 week)'
      }, { status: 400 });
    }

    // Validate message length
    if (message && message.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Message cannot exceed 500 characters'
      }, { status: 400 });
    }

    // Check for high-value gifts (require additional verification)
    const totalAmount = capacity * amount;
    if (totalAmount > 5000) {
      // For now, just log high-value attempts
      console.log(`High-value gift room creation attempt: ₦${totalAmount} by user ${user.id}`);
      
      // In production, you might want to require additional verification
      // For MVP, we'll allow it but log it
    }

    // Rate limiting check (simple implementation)
    const { data: recentRooms } = await supabase
      .from('gift_rooms')
      .select('id')
      .eq('sender_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(10);

    if (recentRooms && recentRooms.length >= 10) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please wait before creating more gift rooms.'
      }, { status: 429 });
    }

    // Create gift room using database function
    const { data: roomData, error: createError } = await supabase
      .rpc('create_gift_room', {
        p_sender_id: user.id,
        p_type: type,
        p_capacity: capacity,
        p_amount: amount,
        p_message: message || null,
        p_expiration_hours: expiration_hours
      } as any);

    if (createError) {
      console.error('Error creating gift room:', createError);
      
      // Handle specific errors
      if (createError.message.includes('Insufficient balance')) {
        return NextResponse.json({
          success: false,
          error: createError.message
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to create gift room. Please try again.'
      }, { status: 500 });
    }

    // Get the created room details
    const { data: room, error: fetchError } = await supabase
      .from('gift_rooms')
      .select('id, token')
      .eq('id', roomData)
      .single();

    if (fetchError || !room) {
      console.error('Error fetching created room:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Gift room created but failed to retrieve details'
      }, { status: 500 });
    }

    // Generate share URL
    const baseUrl = request.nextUrl.origin;
    const shareUrl = `${baseUrl}/gift/${(room as any).token}`;

    return NextResponse.json({
      success: true,
      data: {
        room_id: (room as any).id,
        token: (room as any).token,
        share_url: shareUrl
      }
    });

  } catch (error) {
    console.error('Unexpected error in gift room creation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}