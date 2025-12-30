import { 
  CreateGiftRoomRequest, 
  CreateGiftRoomResponse,
  JoinGiftRoomRequest,
  JoinGiftRoomResponse,
  ClaimGiftRequest,
  ClaimGiftResponse,
  GiftRoomDetailsResponse,
  GiftRoomListResponse,
  GiftRoom,
  DeviceFingerprint
} from '@/types/gift-room';
import { getDeviceIdentifier, generateEnhancedFingerprint } from './device-fingerprint';

class GiftRoomService {
  private baseUrl = '/api/gift-rooms';

  /**
   * Create a new gift room
   */
  async createGiftRoom(params: CreateGiftRoomRequest): Promise<CreateGiftRoomResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create gift room',
        };
      }

      return data;
    } catch (error) {
      console.error('Error creating gift room:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get gift room details by token
   */
  async getGiftRoomDetails(token: string): Promise<GiftRoomDetailsResponse> {
    try {
      const deviceFingerprint = generateEnhancedFingerprint();
      
      const response = await fetch(`${this.baseUrl}/${token}?device_hash=${deviceFingerprint.hash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get gift room details',
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting gift room details:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Join a gift room (create reservation)
   */
  async joinGiftRoom(roomToken: string, contactInfo?: { email?: string; phone?: string; name?: string }): Promise<JoinGiftRoomResponse> {
    try {
      const deviceFingerprint = generateEnhancedFingerprint();
      
      const params: JoinGiftRoomRequest = {
        room_token: roomToken,
        device_fingerprint: deviceFingerprint,
        contact_info: contactInfo,
      };

      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to join gift room',
        };
      }

      return data;
    } catch (error) {
      console.error('Error joining gift room:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Claim a gift using reservation
   */
  async claimGift(reservationId: string): Promise<ClaimGiftResponse> {
    try {
      const params: ClaimGiftRequest = {
        reservation_id: reservationId,
      };

      const response = await fetch(`${this.baseUrl}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to claim gift',
        };
      }

      return data;
    } catch (error) {
      console.error('Error claiming gift:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get user's gift room history (sent and received)
   */
  async getGiftRoomHistory(): Promise<GiftRoomListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get gift room history',
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting gift room history:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get gift rooms created by user
   */
  async getUserGiftRooms(): Promise<{ success: boolean; data?: GiftRoom[]; error?: string }> {
    try {
      console.log('Making request to /api/gift-rooms/my-rooms');
      const response = await fetch(`${this.baseUrl}/my-rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get user gift rooms',
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting user gift rooms:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Cancel/expire a gift room (for sender)
   */
  async cancelGiftRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${roomId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to cancel gift room',
        };
      }

      return data;
    } catch (error) {
      console.error('Error canceling gift room:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Generate share URL for gift room
   */
  generateShareUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/gift/${token}`;
  }

  /**
   * Share gift room via Web Share API or fallback to clipboard
   */
  async shareGiftRoom(token: string, message?: string): Promise<boolean> {
    const shareUrl = this.generateShareUrl(token);
    const shareText = message || 'I sent you a gift! Click the link to claim it:';
    const fullMessage = `${shareText}\n\n${shareUrl}`;

    try {
      // Try Web Share API first (mobile-friendly)
      if (navigator.share) {
        await navigator.share({
          title: 'TADA VTU Gift',
          text: shareText,
          url: shareUrl,
        });
        return true;
      }

      // Fallback to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullMessage);
        return true;
      }

      // Final fallback - create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = fullMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (error) {
      console.error('Error sharing gift room:', error);
      return false;
    }
  }

  /**
   * Check if user has existing reservation in room
   */
  async checkExistingReservation(roomToken: string): Promise<{ hasReservation: boolean; reservation?: any }> {
    try {
      const deviceHash = getDeviceIdentifier();
      const response = await fetch(`${this.baseUrl}/${roomToken}/reservation?device_hash=${deviceHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking existing reservation:', error);
      return { hasReservation: false };
    }
  }

  /**
   * Get refund information for a gift room (only for creators)
   */
  async getRefundInfo(roomId: string): Promise<{
    success: boolean;
    data?: {
      room_id: string;
      status: string;
      total_capacity: number;
      claimed_count: number;
      unclaimed_count: number;
      amount_per_gift: number;
      potential_refund_amount: number;
      can_refund: boolean;
      created_at: string;
      expires_at: string;
      is_expired: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/refund?room_id=${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting refund info:', error);
      return {
        success: false,
        error: 'Failed to get refund information'
      };
    }
  }

  /**
   * Request refund for a gift room (only for creators)
   */
  async requestRefund(roomId: string): Promise<{
    success: boolean;
    data?: {
      refund_amount: number;
      unclaimed_count: number;
      message: string;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_id: roomId }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error requesting refund:', error);
      return {
        success: false,
        error: 'Failed to process refund request'
      };
    }
  }

  /**
   * Validate if current user is the creator of a gift room
   */
  async validateCreatorOwnership(roomId: string): Promise<{
    success: boolean;
    isCreator: boolean;
    error?: string;
  }> {
    try {
      const refundInfo = await this.getRefundInfo(roomId);
      
      if (!refundInfo.success) {
        // If we get a 403 error, user is not the creator
        if (refundInfo.error?.includes('Unauthorized')) {
          return {
            success: true,
            isCreator: false
          };
        }
        return {
          success: false,
          isCreator: false,
          error: refundInfo.error
        };
      }

      return {
        success: true,
        isCreator: true
      };
    } catch (error) {
      console.error('Error validating creator ownership:', error);
      return {
        success: false,
        isCreator: false,
        error: 'Failed to validate ownership'
      };
    }
  }
}

// Export singleton instance
export const giftRoomService = new GiftRoomService();
export default giftRoomService;