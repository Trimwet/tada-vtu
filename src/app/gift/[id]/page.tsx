"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { useAuth } from "@/contexts/AuthContext";
import { getThemeById, getExpiryCountdown, OCCASION_CONFIG } from "@/lib/gift-cards";
import Link from "next/link";
import type { GiftCard } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GiftOpenPage({ params }: PageProps) {
  const { id } = use(params);
  const { user, profile, refreshProfile } = useAuth();
  const [gift, setGift] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"preview" | "opening" | "revealed" | "error">("preview");
  const [openError, setOpenError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchGift();
  }, [id]);

  useEffect(() => {
    if (stage === "revealed") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const fetchGift = async () => {
    try {
      const response = await fetch(`/api/gifts/${id}`);
      const result = await response.json();
      if (result.status && result.data) {
        // Normalize the data - API might return camelCase or snake_case
        const giftData = result.data;
        setGift({
          ...giftData,
          sender_name: giftData.sender_name || giftData.senderName || 'Someone special',
          recipient_email: giftData.recipient_email || giftData.recipientEmail || '',
          recipient_phone: giftData.recipient_phone || giftData.recipientPhone || '',
          recipient_user_id: giftData.recipient_user_id || giftData.recipientUserId || null,
        });
      } else {
        setError(result.message || "Gift not found");
      }
    } catch {
      setError("Failed to load gift");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGift = async () => {
    if (!user) return;
    
    setStage("opening");
    
    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const response = await fetch(`/api/gifts/${id}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.id,
          recipientEmail: user.email,
          recipientPhone: profile?.phone_number,
        }),
      });

      const result = await response.json();

      if (result.status) {
        await refreshProfile();
        setGift(prev => prev ? { ...prev, status: "credited", opened_at: new Date().toISOString() } : null);
        setStage("revealed");
      } else {
        setOpenError(result.message || "Failed to open gift");
        setStage("error");
      }
    } catch {
      setOpenError("Failed to open gift");
      setStage("error");
    }
  };

  const theme = gift ? getThemeById(gift.theme_id) : null;
  const expiry = gift ? getExpiryCountdown(gift.expires_at) : null;
  const occasionConfig = gift ? OCCASION_CONFIG[gift.occasion] : null;

  // Confetti component
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: theme?.primaryColor || "#ec4899",
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
            <IonIcon name="gift" size="32px" color="#ec4899" />
          </div>
          <p className="text-muted-foreground">Loading your gift...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gift) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="close-circle" size="32px" color="#ef4444" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Gift Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || "This gift doesn't exist or has been removed."}</p>
            <Button asChild className="bg-green-500 hover:bg-green-600">
              <Link href="/">Go to TADA VTU</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Not logged in - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-bold text-green-500">TADA</span>
              <span className="text-sm text-muted-foreground">VTU</span>
            </Link>
          </div>

          <Card className="border-border overflow-hidden">
            <div
              className="h-32 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${occasionConfig?.color || "#ec4899"}, ${theme?.secondaryColor || "#f472b6"})`,
              }}
            >
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                <IonIcon name={occasionConfig?.icon || "gift"} size="40px" color="white" />
              </div>
            </div>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">You have a gift!</h2>
              <p className="text-muted-foreground mb-1">
                From: <span className="font-medium text-foreground">{gift.sender_name}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-6">Log in or create an account to open your gift</p>
              <div className="space-y-3">
                <Button asChild className="w-full bg-pink-500 hover:bg-pink-600">
                  <Link href={`/login?redirect=/gift/${id}`}>Log In to Open</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/register?redirect=/gift/${id}`}>Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if user is the recipient (case-insensitive email comparison)
  const userEmail = user.email?.toLowerCase().trim() || "";
  const giftEmail = gift.recipient_email?.toLowerCase().trim() || "";
  const userPhone = profile?.phone_number?.replace(/\D/g, '').slice(-10) || "";
  const giftPhone = gift.recipient_phone?.replace(/\D/g, '').slice(-10) || "";
  const isRecipient = userEmail === giftEmail || gift.recipient_user_id === user.id || userPhone === giftPhone;

  // Not the intended recipient
  if (!isRecipient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="lock-closed" size="32px" color="#f59e0b" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Not Your Gift</h2>
            <p className="text-muted-foreground mb-4">
              This gift was sent to someone else. Only the intended recipient can open it.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-muted-foreground mb-1">Sent to:</p>
              <p className="font-medium text-foreground">{gift.recipient_email}</p>
            </div>
            <Button asChild className="w-full bg-green-500 hover:bg-green-600">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gift is already fully claimed (airtime sent)
  if (gift.status === "credited") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {showConfetti && <Confetti />}
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-bold text-green-500">TADA</span>
              <span className="text-sm text-muted-foreground">VTU</span>
            </Link>
          </div>
          <Card className="border-border overflow-hidden">
            <div
              className="h-40 flex flex-col items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${occasionConfig?.color || "#ec4899"}, ${theme?.secondaryColor || "#f472b6"})`,
              }}
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                <IonIcon name="checkmark-circle" size="40px" color="white" />
              </div>
              <p className="text-white font-semibold">Gift Claimed!</p>
            </div>
            <CardContent className="p-6 text-center space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="text-lg font-bold text-foreground">{gift.sender_name}</p>
              </div>
              {gift.personal_message && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-foreground italic">&ldquo;{gift.personal_message}&rdquo;</p>
                </div>
              )}
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-1">Gift amount</p>
                <p className="text-4xl font-bold text-foreground">₦{gift.amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Airtime</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <IonIcon name="checkmark-circle" size="20px" />
                  <span className="font-medium">Sent to {gift.recipient_phone}</span>
                </div>
              </div>
              <Button asChild className="w-full" style={{ backgroundColor: occasionConfig?.color || "#ec4899" }}>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Powered by TADA VTU • Nigeria&apos;s favorite recharge platform
          </p>
        </div>
      </div>
    );
  }

  // Expired gift
  if (expiry?.expired && stage === "preview") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="time" size="32px" color="#6b7280" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Gift Expired</h2>
            <p className="text-muted-foreground mb-6">This gift has expired and can no longer be opened.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {showConfetti && <Confetti />}

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-green-500">TADA</span>
            <span className="text-sm text-muted-foreground">VTU</span>
          </Link>
        </div>

        <Card className="border-border overflow-hidden">
          {/* Preview Stage */}
          {stage === "preview" && (
            <>
              <div
                className="h-40 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${occasionConfig?.color || "#ec4899"}, ${theme?.secondaryColor || "#f472b6"})`,
                }}
              >
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                  <IonIcon name={occasionConfig?.icon || "gift"} size="40px" color="white" />
                </div>
                <p className="text-white/90 text-sm font-medium mt-2">{occasionConfig?.label || "Special"} Gift</p>
              </div>
              <CardContent className="p-6 text-center space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">You have a gift!</h2>
                  <p className="text-muted-foreground">
                    From: <span className="font-medium text-foreground">{gift.sender_name}</span>
                  </p>
                </div>

                {expiry && !expiry.expired && (
                  <p className="text-sm text-amber-500 flex items-center justify-center gap-1">
                    <IonIcon name="time-outline" size="16px" />
                    {expiry.message}
                  </p>
                )}

                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Airtime will be sent to:</p>
                  <p className="font-bold text-foreground text-lg">{gift.recipient_phone}</p>
                </div>

                <Button
                  onClick={handleOpenGift}
                  className="w-full h-12 text-lg font-semibold"
                  style={{ backgroundColor: occasionConfig?.color || "#ec4899" }}
                >
                  <IonIcon name="gift" size="20px" className="mr-2" />
                  Open Gift
                </Button>
              </CardContent>
            </>
          )}


          {/* Opening Stage */}
          {stage === "opening" && (
            <CardContent className="p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div
                  className="absolute inset-0 rounded-2xl animate-pulse"
                  style={{ backgroundColor: occasionConfig?.color || "#ec4899" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <IonIcon name={occasionConfig?.icon || "gift"} size="48px" color="white" className="animate-bounce" />
                </div>
              </div>
              <p className="text-lg font-medium text-foreground animate-pulse">Opening your gift...</p>
            </CardContent>
          )}

          {/* Revealed Stage */}
          {stage === "revealed" && (
            <>
              <div
                className="h-40 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${occasionConfig?.color || "#ec4899"}, ${theme?.secondaryColor || "#f472b6"})`,
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                  <IonIcon name="checkmark-circle" size="40px" color="white" />
                </div>
                <p className="text-white font-semibold">Gift Opened!</p>
              </div>
              <CardContent className="p-6 text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-lg font-bold text-foreground">{gift.sender_name}</p>
                </div>

                {gift.personal_message && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-foreground italic">&ldquo;{gift.personal_message}&rdquo;</p>
                  </div>
                )}

                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-1">You received</p>
                  <p className="text-4xl font-bold text-foreground">₦{gift.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Airtime</p>
                </div>

                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <IonIcon name="checkmark-circle" size="20px" />
                    <span className="font-medium">Sent to {gift.recipient_phone}!</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1" style={{ backgroundColor: occasionConfig?.color || "#ec4899" }}>
                    <Link href="/dashboard">Done</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: "I received a gift on TADA VTU!",
                          text: `${gift.sender_name} sent me a gift!`,
                          url: "https://tadavtu.com",
                        });
                      }
                    }}
                  >
                    <IonIcon name="share-social" size="18px" className="mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Error Stage */}
          {stage === "error" && (
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <IonIcon name="close-circle" size="32px" color="#ef4444" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Oops!</h2>
              <p className="text-muted-foreground">{openError}</p>
              <div className="flex gap-2">
                <Button onClick={() => setStage("preview")} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button asChild className="flex-1 bg-green-500 hover:bg-green-600">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by TADA VTU • Nigeria&apos;s favorite recharge platform
        </p>
      </div>
    </div>
  );
}
