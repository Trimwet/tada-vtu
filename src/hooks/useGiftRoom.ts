import { useState, useCallback } from 'react';
import { giftRoomService } from '@/lib/gift-room-service';
import { createClient } from '@/lib/supabase/client';
import {
  CreateGiftRoomRequest,
  GiftRoom,
  GiftClaim,
  GiftRoomDetailsResponse
} from '@/types/gift-room';
import { toast } from '@/lib/toast';

export function useGiftRoom() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const createGiftRoom = useCallback(async (params: CreateGiftRoomRequest) => {
    setCreating(true);
    try {
      const response = await giftRoomService.createGiftRoom(params);

      if (response.success && response.data) {
        toast.success("Gift room created!", {
          description: `Share the link to send your gift`
        });
        return response.data;
      } else {
        toast.error("Failed to create gift room", response.error);
        return null;
      }
    } catch (error) {
      console.error("Error creating gift room:", error);
      toast.error("Something went wrong", "Please try again");
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  const getGiftRoomDetails = useCallback(async (token: string): Promise<GiftRoomDetailsResponse['data'] | null> => {
    setLoading(true);
    try {
      const response = await giftRoomService.getGiftRoomDetails(token);

      if (response.success && response.data) {
        return response.data;
      } else {
        toast.error("Failed to load gift room", response.error);
        return null;
      }
    } catch (error) {
      console.error("Error getting gift room details:", error);
      toast.error("Something went wrong", "Please try again");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinGiftRoom = useCallback(async (
    roomToken: string,
    contactInfo?: { email?: string; phone?: string; name?: string }
  ) => {
    setJoining(true);
    try {
      const response = await giftRoomService.joinGiftRoom(roomToken, contactInfo);

      if (response.success && response.data) {
        toast.success("Spot secured!", {
          description: "Complete signup to claim your gift"
        });
        return response.data;
      } else {
        toast.error("Failed to join gift room", response.error);
        return null;
      }
    } catch (error) {
      console.error("Error joining gift room:", error);
      toast.error("Something went wrong", "Please try again");
      return null;
    } finally {
      setJoining(false);
    }
  }, []);

  const claimGift = useCallback(async (reservationId: string) => {
    setClaiming(true);
    try {
      const response = await giftRoomService.claimGift(reservationId);

      if (response.success && response.data) {
        toast.payment(
          "Gift claimed successfully!",
          `₦${response.data.amount.toLocaleString()} added to your wallet`
        );

        if (response.data.referral_bonus_awarded) {
          toast.success("Bonus earned!", {
            description: "Sender received ₦100 referral bonus"
          });
        }

        return response.data;
      } else {
        toast.error("Failed to claim gift", response.error);
        return null;
      }
    } catch (error) {
      console.error("Error claiming gift:", error);
      toast.error("Something went wrong", "Please try again");
      return null;
    } finally {
      setClaiming(false);
    }
  }, []);

  const shareGiftRoom = useCallback(async (token: string, message?: string) => {
    try {
      const success = await giftRoomService.shareGiftRoom(token, message);

      if (success) {
        toast.success("Shared!", { description: "Gift link copied to clipboard" });
        return true;
      } else {
        toast.error("Failed to share", "Please copy the link manually");
        return false;
      }
    } catch (error) {
      console.error("Error sharing gift room:", error);
      toast.error("Something went wrong", "Please try again");
      return false;
    }
  }, []);

  const getGiftRoomHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await giftRoomService.getGiftRoomHistory();

      if (response.success && response.data) {
        return response.data;
      } else {
        toast.error("Failed to load gift history", response.error);
        return null;
      }
    } catch (error) {
      console.error("Error getting gift history:", error);
      toast.error("Something went wrong", "Please try again");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserGiftRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await giftRoomService.getUserGiftRooms();

      if (response.success && response.data) {
        return response.data;
      } else {
        toast.error("Failed to load gift rooms", response.error);
        return [];
      }
    } catch (error) {
      console.error("Error getting user gift rooms:", error);
      toast.error("Something went wrong", "Please try again");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    creating,
    joining,
    claiming,
    createGiftRoom,
    getGiftRoomDetails,
    joinGiftRoom,
    claimGift,
    shareGiftRoom,
    getGiftRoomHistory,
    getUserGiftRooms,
    subscribeToRoom: useCallback((roomId: string, onUpdate: () => void) => {
      const supabase = createClient();
      console.log(`Subscribing to room ${roomId}`);

      const channel = supabase
        .channel(`room-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gift_rooms',
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            onUpdate();
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for room ${roomId}:`, status);
        });

      return () => {
        console.log(`Unsubscribing from room ${roomId}`);
        supabase.removeChannel(channel);
      };
    }, []),
  };
}

export default useGiftRoom;
