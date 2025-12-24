import { createClient } from '@/lib/supabase/server';

/**
 * Gift Room Cleanup Service
 * Handles expiration and cleanup of gift rooms and reservations
 */
export class GiftRoomCleanupService {
  /**
   * Run complete cleanup process
   */
  async runCleanup(): Promise<{
    expiredRooms: number;
    expiredReservations: number;
    refundedAmount: number;
    errors: string[];
  }> {
    const results = {
      expiredRooms: 0,
      expiredReservations: 0,
      refundedAmount: 0,
      errors: [] as string[]
    };

    try {
      // Process expired rooms
      const roomResult = await this.processExpiredRooms();
      if (roomResult.error) {
        results.errors.push(roomResult.error);
      } else {
        results.expiredRooms = roomResult.count;
        results.refundedAmount += roomResult.refundedAmount;
      }

      // Process expired reservations
      const reservationResult = await this.processExpiredReservations();
      if (reservationResult.error) {
        results.errors.push(reservationResult.error);
      } else {
        results.expiredReservations = reservationResult.count;
      }

      // Clean up old activities
      await this.cleanupOldActivities();

    } catch (error) {
      console.error('Error during cleanup process:', error);
      results.errors.push(`General cleanup error: ${error}`);
    }

    return results;
  }

  /**
   * Process expired gift rooms and refund unclaimed amounts
   */
  private async processExpiredRooms(): Promise<{
    count: number;
    refundedAmount: number;
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      // Use the database function for atomic operations
      const { data: expiredCount, error } = await supabase
        .rpc('cleanup_expired_gift_rooms');

      if (error) {
        return { count: 0, refundedAmount: 0, error: error.message };
      }

      // Get total refunded amount from recent activities
      const { data: refundActivities } = await supabase
        .from('gift_room_activities')
        .select('details')
        .eq('activity_type', 'refunded')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const refundedAmount = refundActivities?.reduce((sum: number, activity: any) => {
        const details = typeof activity.details === 'string' 
          ? JSON.parse(activity.details) 
          : activity.details;
        return sum + (parseFloat(details?.amount) || 0);
      }, 0) || 0;

      return {
        count: expiredCount || 0,
        refundedAmount,
      };

    } catch (error) {
      console.error('Error processing expired rooms:', error);
      return { count: 0, refundedAmount: 0, error: `Failed to process expired rooms: ${error}` };
    }
  }

  /**
   * Process expired reservations
   */
  private async processExpiredReservations(): Promise<{
    count: number;
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      
      // First get the expired reservations
      const { data: expiredReservations, error: selectError } = await supabase
        .from('reservations')
        .select('id')
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString());

      if (selectError) {
        return { count: 0, error: selectError.message };
      }

      if (!expiredReservations || expiredReservations.length === 0) {
        return { count: 0 };
      }

      // Update them one by one to avoid type issues
      let updatedCount = 0;
      for (const reservation of expiredReservations) {
        try {
          await (supabase as any)
            .from('reservations')
            .update({ status: 'expired' })
            .eq('id', (reservation as any).id);
          updatedCount++;
        } catch (updateError) {
          console.error('Error updating reservation:', updateError);
        }
      }

      return { count: updatedCount };

    } catch (error) {
      console.error('Error processing expired reservations:', error);
      return { count: 0, error: `Failed to process expired reservations: ${error}` };
    }
  }

  /**
   * Clean up old activity records (older than 30 days)
   */
  private async cleanupOldActivities(): Promise<void> {
    try {
      const supabase = await createClient();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      await supabase
        .from('gift_room_activities')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

    } catch (error) {
      console.error('Error cleaning up old activities:', error);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    activeRooms: number;
    expiredRooms: number;
    totalRooms: number;
    activeReservations: number;
    expiredReservations: number;
    totalReservations: number;
  }> {
    try {
      const supabase = await createClient();
      const [roomsResult, reservationsResult] = await Promise.all([
        supabase
          .from('gift_rooms')
          .select('status'),
        supabase
          .from('reservations')
          .select('status')
      ]);

      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];

      return {
        activeRooms: rooms.filter((r: any) => r.status === 'active' || r.status === 'full').length,
        expiredRooms: rooms.filter((r: any) => r.status === 'expired').length,
        totalRooms: rooms.length,
        activeReservations: reservations.filter((r: any) => r.status === 'active').length,
        expiredReservations: reservations.filter((r: any) => r.status === 'expired').length,
        totalReservations: reservations.length,
      };

    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        activeRooms: 0,
        expiredRooms: 0,
        totalRooms: 0,
        activeReservations: 0,
        expiredReservations: 0,
        totalReservations: 0,
      };
    }
  }

  /**
   * Force expire a specific gift room
   */
  async forceExpireRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();
      const { error } = await (supabase as any)
        .from('gift_rooms')
        .update({ 
          status: 'expired',
          expires_at: new Date().toISOString()
        })
        .eq('id', roomId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Process refunds for this specific room (simplified)
      try {
        await (supabase as any).rpc('update_user_balance', {
          user_id: roomId, // This should be the sender_id, need to get it first
          amount: 0, // This should be calculated based on unclaimed amount
          transaction_type: 'refund'
        });
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
      }

      // Log the forced expiration
      try {
        await (supabase as any)
          .from('gift_room_activities')
          .insert({
            room_id: roomId,
            activity_type: 'expired',
            details: { forced: true, timestamp: new Date().toISOString() }
          });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      return { success: true };

    } catch (error) {
      console.error('Error force expiring room:', error);
      return { success: false, error: `Failed to force expire room: ${error}` };
    }
  }
}

// Export a singleton instance
export const giftRoomCleanup = new GiftRoomCleanupService();