import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (optional - could be public stats)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Get overall gift room statistics
    const [roomsResult, reservationsResult, claimsResult] = await Promise.all([
      supabase
        .from('gift_rooms')
        .select('status, type, amount, capacity, joined_count, claimed_count, created_at'),
      supabase
        .from('reservations')
        .select('status, created_at'),
      supabase
        .from('gift_claims')
        .select('amount, claimed_at, referral_bonus_awarded')
    ]);

    const rooms = roomsResult.data || [];
    const reservations = reservationsResult.data || [];
    const claims = claimsResult.data || [];

    // Type assertion for rooms to ensure proper typing
    type RoomStats = {
      status: string;
      type: string;
      amount: number;
      capacity: number;
      joined_count: number;
      claimed_count: number;
      created_at: string;
    };

    const typedRooms = rooms as RoomStats[];

    // Calculate statistics
    const stats = {
      rooms: {
        total: typedRooms.length,
        active: typedRooms.filter(r => r.status === 'active').length,
        full: typedRooms.filter(r => r.status === 'full').length,
        expired: typedRooms.filter(r => r.status === 'expired').length,
        completed: typedRooms.filter(r => r.status === 'completed').length,
      },
      reservations: {
        total: reservations.length,
        active: reservations.filter(r => (r as any).status === 'active').length,
        claimed: reservations.filter(r => (r as any).status === 'claimed').length,
        expired: reservations.filter(r => (r as any).status === 'expired').length,
      },
      financial: {
        totalGiftValue: typedRooms.reduce((sum, room) => sum + (room.capacity * room.amount), 0),
        claimedValue: claims.reduce((sum, claim) => sum + (claim as any).amount, 0),
        referralBonuses: claims.filter(c => (c as any).referral_bonus_awarded).length * 100,
      },
      engagement: {
        averageJoinRate: typedRooms.length > 0 
          ? typedRooms.reduce((sum, room) => sum + (room.joined_count / room.capacity), 0) / typedRooms.length 
          : 0,
        averageClaimRate: typedRooms.length > 0
          ? typedRooms.reduce((sum, room) => sum + (room.claimed_count / Math.max(room.joined_count, 1)), 0) / typedRooms.length
          : 0,
      },
      types: {
        personal: typedRooms.filter(r => r.type === 'personal').length,
        group: typedRooms.filter(r => r.type === 'group').length,
        public: typedRooms.filter(r => r.type === 'public').length,
      }
    };

    // Add user-specific stats if authenticated
    let userStats = null;
    if (user) {
      const [userRoomsResult, userClaimsResult] = await Promise.all([
        supabase
          .from('gift_rooms')
          .select('*')
          .eq('sender_id', user.id),
        supabase
          .from('gift_claims')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const userRooms = userRoomsResult.data || [];
      const userClaims = userClaimsResult.data || [];

      // Type assertion for user rooms
      type UserRoom = {
        total_amount: number;
      };

      type UserClaim = {
        amount: number;
        referral_bonus_awarded: boolean;
      };

      const typedUserRooms = userRooms as UserRoom[];
      const typedUserClaims = userClaims as UserClaim[];

      userStats = {
        roomsSent: typedUserRooms.length,
        totalSent: typedUserRooms.reduce((sum, room) => sum + room.total_amount, 0),
        giftsReceived: typedUserClaims.length,
        totalReceived: typedUserClaims.reduce((sum, claim) => sum + claim.amount, 0),
        referralBonusesEarned: typedUserClaims.filter(c => c.referral_bonus_awarded).length * 100,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        platform: stats,
        user: userStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting gift room stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}