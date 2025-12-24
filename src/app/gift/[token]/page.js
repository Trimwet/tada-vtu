"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import useGiftRoom from "@/hooks/useGiftRoom";

export default function GiftRoomPage() {
  const params = useParams();
  const token = params.token;

  const {
    getGiftRoomDetails,
    joinGiftRoom,
    subscribeToRoom,
    joining
  } = useGiftRoom();

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    name: "",
  });
  const [showContactForm, setShowContactForm] = useState(false);

  // Load gift room data
  useEffect(() => {
    if (!token) return;

    const loadGiftRoom = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/gift-rooms/${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setRoomData(data.data);
        } else {
          setError(data.error || "Failed to load gift room");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };

    loadGiftRoom();
  }, [token]);

  const handleJoinRoom = async () => {
    if (!roomData) return;

    setJoining(true);
    try {
      const response = await fetch(`/api/gift-rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          contact_info: showContactForm ? contactInfo : undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message
        alert("Spot secured! Complete signup to claim your gift");

        // Update room data
        setRoomData(prev => ({
          ...prev,
          user_reservation: data.data.reservation,
          can_join: false,
          spots_remaining: Math.max(0, prev.spots_remaining - 1),
          room: data.data.room
        }));
      } else {
        alert("Failed to join: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  const { room, sender, user_reservation, can_join, spots_remaining } = roomData;

  return (
    <div className="min-h-screen bg-background">
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
                ₦{room?.amount?.toLocaleString() || "0"}
              </div>
              <p className="text-sm text-muted-foreground">
                {room?.type || "Gift"}
              </p>
            </div>

            {/* Personal Message */}
            {room?.message && (
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
                  {room?.joined_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined
                </div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">
                  {spots_remaining || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Spots Left
                </div>
              </div>
            </div>

            {/* Join Options */}
            {can_join && !user_reservation && (
              <div className="space-y-4">
                {!showContactForm ? (
                  <div className="space-y-3">
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

                    <button
                      onClick={() => setShowContactForm(true)}
                      className="w-full text-sm text-green-500 hover:text-green-400 transition-colors"
                    >
                      + Add contact info for reminders
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Name (optional)</Label>
                        <Input
                          type="text"
                          placeholder="Your name"
                          value={contactInfo.name}
                          onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Email (optional)</Label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={contactInfo.email}
                          onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Phone (optional)</Label>
                        <Input
                          type="tel"
                          placeholder="080XXXXXXXX"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowContactForm(false)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleJoinRoom}
                        disabled={joining}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      >
                        {joining ? "Joining..." : "Join Room"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reservation Status */}
            {user_reservation && (
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

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Complete signup to claim your gift
                  </p>
                  <div className="flex gap-3">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full">
                        <IonIcon name="log-in" size="18px" className="mr-2" />
                        Login
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full bg-green-500 hover:bg-green-600">
                        <IonIcon name="person-add" size="18px" className="mr-2" />
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
// 
Additional functionality for claim and share
const handleClaimGift = async () => {
  if (!roomData?.user_reservation) return;

  setClaiming(true);
  try {
    const response = await fetch(`/api/gift-rooms/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservation_id: roomData.user_reservation.id
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`Gift claimed successfully! ₦${data.data.amount.toLocaleString()} added to your wallet`);
      
      if (data.data.referral_bonus_awarded) {
        alert("Bonus earned! Sender received ₦100 referral bonus");
      }

      // Redirect to dashboard after successful claim
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else {
      alert("Failed to claim gift: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Error claiming gift:", error);
    alert("Something went wrong. Please try again.");
  } finally {
    setClaiming(false);
  }
};

const handleShare = async () => {
  if (!roomData) return;

  const message = roomData.room.message 
    ? `${roomData.sender.full_name} sent you a gift: "${roomData.room.message}"`
    : `${roomData.sender.full_name} sent you a gift!`;

  const url = window.location.href;
  
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'TADA VTU Gift Room',
        text: message,
        url: url
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Gift link copied to clipboard!");
    }
  } catch (error) {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      alert("Gift link copied to clipboard!");
    } catch (err) {
      alert("Please copy the link manually: " + url);
    }
  }
};