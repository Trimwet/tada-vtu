"use client";
// v2.0 - Simplified gift room flow: requires login before joining

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { giftRoomService } from "@/lib/gift-room-service";
import {
  GiftRoom,
  Reservation,
  getGiftRoomTypeLabel,
  getTimeUntilExpiration,
  isGiftRoomExpired
} from "@/types/gift-room";
import { AnimatedBackground } from "@/components/animated-background";

interface GiftRoomPageData {
  room: GiftRoom;
  sender: {
    full_name: string;
    referral_code: string;
  };
  user_reservation?: Reservation;
  can_join: boolean;
  spots_remaining: number;
}

export default function GiftRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [roomData, setRoomData] = useState<GiftRoomPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load gift room data
  useEffect(() => {
    if (!token) return;

    const loadGiftRoom = async () => {
      setLoading(true);
      const response = await giftRoomService.getGiftRoomDetails(token);

      if (response.success && response.data) {
        setRoomData(response.data);
      } else {
        setError(response.error || "Failed to load gift room");
      }
      setLoading(false);
    };

    loadGiftRoom();
  }, [token]);


  // SIMPLIFIED: Join requires login - no more orphaned reservations
  const handleJoinRoom = async () => {
    if (!roomData || !user) return;

    setJoining(true);
    try {
      const response = await giftRoomService.joinGiftRoom(token);

      if (response.success && response.data) {
        toast.success("Spot secured!", {
          description: "You can now claim your gift"
        });

        // Update room data with new reservation
        setRoomData(prev => prev ? {
          ...prev,
          user_reservation: response.data!.reservation,
          can_join: false,
          spots_remaining: Math.max(0, prev.spots_remaining - 1),
          room: response.data!.room
        } : null);
      } else {
        toast.error("Failed to join", response.error);
      }
    } catch (err) {
      console.error("Error joining room:", err);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setJoining(false);
    }
  };

  const handleClaimGift = async () => {
    if (!roomData?.user_reservation || !user) return;

    setClaiming(true);
    try {
      const response = await giftRoomService.claimGift(roomData.user_reservation.id);

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

        // Redirect to dashboard after successful claim
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        toast.error("Failed to claim gift", response.error);
      }
    } catch (err) {
      console.error("Error claiming gift:", err);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setClaiming(false);
    }
  };

  const handleShare = async () => {
    if (!roomData) return;

    const message = roomData.room.message
      ? `${roomData.sender?.full_name || "Someone"} sent you a gift: "${roomData.room.message}"`
      : `${roomData.sender?.full_name || "Someone"} sent you a gift!`;

    const success = await giftRoomService.shareGiftRoom(token, message);
    if (success) {
      toast.success("Shared!", { description: "Gift link copied to clipboard" });
    } else {
      toast.error("Failed to share", "Please copy the link manually");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading gift room...</p>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AnimatedBackground />
        <Card className="relative z-10 w-full max-w-md border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="alert-circle" size="32px" className="text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Gift Room Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || "This gift room doesn't exist or has been removed."}
            </p>
            <Link href="/dashboard">
              <Button className="w-full">
                <IonIcon name="home" size="18px" className="mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { room, sender = { full_name: "Someone", referral_code: "" }, user_reservation, can_join, spots_remaining } = roomData;
  const isExpired = isGiftRoomExpired(room.expires_at);
  const timeLeft = getTimeUntilExpiration(room.expires_at);


  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
            <IonIcon name="gift" size="40px" color="white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            You've Got a Gift!
          </h1>
          <p className="text-muted-foreground">
            From {sender?.full_name || "Someone"}
          </p>
        </div>

        {/* Gift Room Card */}
        <Card className="mb-6 overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <CardContent className="p-6">
            {/* Gift Amount */}
            <div className="text-center mb-6">
              <div className="text-4xl sm:text-5xl font-bold text-green-500 mb-2">
                ₦{room.amount.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                {getGiftRoomTypeLabel(room.type)}
              </p>
            </div>

            {/* Personal Message */}
            {room.message && (
              <div className="bg-background/80 rounded-xl p-4 mb-6 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    <IonIcon name="chatbubble" size="16px" color="#22c55e" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Personal Message
                    </p>
                    <p className="text-muted-foreground italic">
                      "{room.message}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Room Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">
                  {room.joined_count}
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined
                </div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">
                  {spots_remaining}
                </div>
                <div className="text-xs text-muted-foreground">
                  Spots Left
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            {isExpired ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="time" size="32px" className="text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Gift Expired
                </h3>
                <p className="text-muted-foreground">
                  This gift room has expired and is no longer available.
                </p>
              </div>
            ) : user_reservation ? (
              <div className="space-y-4">
                {/* Reservation Confirmed */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <IonIcon name="checkmark-circle" size="18px" color="#22c55e" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-500">Spot Secured!</p>
                      <p className="text-sm text-muted-foreground">
                        Your gift is reserved
                      </p>
                    </div>
                  </div>

                  {user_reservation.status === 'claimed' ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <IonIcon name="gift" size="32px" color="#22c55e" />
                      </div>
                      <p className="font-semibold text-green-500 mb-1">
                        Gift Already Claimed!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ₦{room.amount.toLocaleString()} was added to your wallet
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaimGift}
                      disabled={claiming}
                      className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                    >
                      {claiming ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Claiming...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <IonIcon name="gift" size="20px" />
                          Claim ₦{room.amount.toLocaleString()}
                        </div>
                      )}
                    </Button>
                  )}
                </div>

                {/* Expiration Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <IonIcon name="time" size="16px" color="#f59e0b" />
                    <span className="text-sm font-medium text-amber-600">
                      {timeLeft}
                    </span>
                  </div>
                </div>
              </div>
            ) : room.status === 'full' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="people" size="32px" className="text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Gift Room Full
                </h3>
                <p className="text-muted-foreground">
                  All spots have been taken. Try joining another gift room.
                </p>
              </div>
            ) : can_join ? (
              <div className="space-y-4">
                {user ? (
                  // User is logged in - can join directly
                  <Button
                    onClick={handleJoinRoom}
                    disabled={joining}
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    {joining ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Securing Spot...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IonIcon name="add-circle" size="20px" />
                        Secure My Spot
                      </div>
                    )}
                  </Button>
                ) : (
                  // User not logged in - require login first
                  <div className="space-y-3">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <IonIcon name="information-circle" size="20px" />
                        <span className="font-medium">Login Required</span>
                      </div>
                      <p className="text-sm text-green-600/80 dark:text-green-300 mt-1">
                        Please login or create an account to secure your spot
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/login?redirect=/gift/${token}`} className="flex-1">
                        <Button variant="outline" className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10">
                          <IonIcon name="log-in" size="18px" className="mr-2" />
                          Login
                        </Button>
                      </Link>
                      <Link href={`/register?redirect=/gift/${token}`} className="flex-1">
                        <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                          <IonIcon name="person-add" size="18px" className="mr-2" />
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Time Left */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <IonIcon name="time" size="16px" color="#22c55e" />
                    <span className="text-sm font-medium text-green-600">
                      {timeLeft}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="close-circle" size="32px" className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Cannot Join
                </h3>
                <p className="text-muted-foreground">
                  This gift room is no longer available for joining.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share Button */}
        {room.status === 'active' && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <IonIcon name="share-social" size="20px" color="#22c55e" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Share this gift</p>
                    <p className="text-sm text-muted-foreground">
                      Help others find this gift room
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                >
                  <IonIcon name="share" size="16px" className="mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              <IonIcon name="home" size="18px" className="mr-2" />
              Go to TADA VTU
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
