"use client";

import { useState, useEffect, use, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { useAuth } from "@/contexts/AuthContext";
import { getThemeById, getExpiryCountdown, OCCASION_CONFIG } from "@/lib/gift-cards";
import Link from "next/link";
import type { GiftCard } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Floating particles component
function FloatingParticles({ color, count = 20 }: { color: string; count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            backgroundColor: color,
            opacity: Math.random() * 0.5 + 0.2,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 10}s`,
          }}
        />
      ))}
    </div>
  );
}

// Confetti explosion component
function ConfettiExplosion({ colors }: { colors: string[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(80)].map((_, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 12 + 6;
        const isCircle = Math.random() > 0.5;
        return (
          <div
            key={i}
            className="absolute animate-confetti-burst"
            style={{
              left: `${50 + (Math.random() - 0.5) * 60}%`,
              top: "40%",
              width: `${size}px`,
              height: isCircle ? `${size}px` : `${size * 0.4}px`,
              backgroundColor: color,
              borderRadius: isCircle ? "50%" : "2px",
              animationDelay: `${Math.random() * 0.3}s`,
              "--tx": `${(Math.random() - 0.5) * 400}px`,
              "--ty": `${Math.random() * -600 - 100}px`,
              "--r": `${Math.random() * 1080}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}


// Sparkle stars component
function SparkleStars({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sparkle-star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill={color}>
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// Glowing ring animation
function GlowingRings({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 animate-ring-expand"
          style={{
            borderColor: color,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
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
  const [showSparkles, setShowSparkles] = useState(false);

  const fetchGift = useCallback(async () => {
    try {
      const response = await fetch(`/api/gifts/${id}`);
      const result = await response.json();
      if (result.status && result.data) {
        const giftData = result.data;
        setGift({
          ...giftData,
          sender_name: giftData.sender_name || giftData.senderName || "Someone special",
          recipient_email: giftData.recipient_email || giftData.recipientEmail || "",
          recipient_phone: giftData.recipient_phone || giftData.recipientPhone || "",
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
  }, [id]);

  useEffect(() => {
    fetchGift();
  }, [fetchGift]);

  useEffect(() => {
    if (stage === "revealed") {
      setShowConfetti(true);
      setShowSparkles(true);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
      const sparkleTimer = setTimeout(() => setShowSparkles(false), 6000);
      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(sparkleTimer);
      };
    }
  }, [stage]);

  
const handleOpenGift = async () => {
    if (!user) return;
    setStage("opening");
    
    // Dramatic opening animation delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

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
        setGift((prev) =>
          prev ? { ...prev, status: "credited", opened_at: new Date().toISOString() } : null
        );
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
  
  // Theme colors - use green as primary brand color
  const primaryColor = occasionConfig?.color || "#22c55e";
  const secondaryColor = theme?.secondaryColor || "#10b981";
  const confettiColors = [primaryColor, secondaryColor, "#FFD700", "#FF6B9D", "#87CEEB"];

  // Loading state with premium animation
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center animate-gift-float shadow-2xl shadow-green-500/30">
              <IonIcon name="gift" size="48px" color="white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-green-500/20 animate-ping" />
          </div>
          <p className="text-muted-foreground mt-6 animate-pulse">Unwrapping your gift...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gift) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-950/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <IonIcon name="close-circle" size="40px" color="#ef4444" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Gift Not Found</h2>
          <p className="text-muted-foreground mb-8">{error || "This gift doesn't exist or has been removed."}</p>
          <Button asChild className="w-full h-12 bg-green-500 hover:bg-green-600 rounded-xl font-semibold">
            <Link href="/">Go to TADA VTU</Link>
          </Button>
        </div>
      </div>
    );
  }

 
 // Not logged in - premium login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-950/20 flex items-center justify-center p-4 relative overflow-hidden">
        <FloatingParticles color={primaryColor} count={15} />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-3xl font-bold text-green-500">TADA</span>
              <span className="text-lg text-muted-foreground">VTU</span>
            </Link>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border overflow-hidden shadow-2xl">
            {/* Animated header */}
            <div
              className="h-44 flex flex-col items-center justify-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <FloatingParticles color="rgba(255,255,255,0.3)" count={10} />
              <div className="relative">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-gift-float shadow-lg">
                  <IonIcon name={occasionConfig?.icon || "gift"} size="48px" color="white" />
                </div>
                <GlowingRings color="rgba(255,255,255,0.4)" />
              </div>
              <p className="text-white/90 text-sm font-medium mt-3">{occasionConfig?.label || "Special"} Gift</p>
            </div>

            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">You have a gift!</h2>
              <p className="text-muted-foreground mb-1">
                From: <span className="font-semibold text-foreground">{gift.sender_name}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-8">Log in or create an account to open your gift</p>
              
              <div className="space-y-3">
                <Button asChild className="w-full h-12 rounded-xl font-semibold text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                  <Link href={`/login?redirect=/gift/${id}`}>
                    <IonIcon name="log-in-outline" size="20px" className="mr-2" />
                    Log In to Open
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-12 rounded-xl font-semibold border-2">
                  <Link href={`/register?redirect=/gift/${id}`}>
                    <IonIcon name="person-add-outline" size="20px" className="mr-2" />
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is the recipient
  const userEmail = user.email?.toLowerCase().trim() || "";
  const giftEmail = gift.recipient_email?.toLowerCase().trim() || "";
  const userPhone = profile?.phone_number?.replace(/\D/g, "").slice(-10) || "";
  const giftPhone = gift.recipient_phone?.replace(/\D/g, "").slice(-10) || "";
  const isRecipient = userEmail === giftEmail || gift.recipient_user_id === user.id || userPhone === giftPhone;

  // Not the intended recipient
  if (!isRecipient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <IonIcon name="lock-closed" size="40px" color="#f59e0b" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Not Your Gift</h2>
          <p className="text-muted-foreground mb-6">This gift was sent to someone else.</p>
          <div className="bg-muted/50 rounded-xl p-4 mb-8">
            <p className="text-sm text-muted-foreground mb-1">Sent to:</p>
            <p className="font-semibold text-foreground">{gift.recipient_email}</p>
          </div>
          <Button asChild className="w-full h-12 bg-green-500 hover:bg-green-600 rounded-xl font-semibold">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Gift already claimed
  if (gift.status === "credited") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-950/20 flex items-center justify-center p-4 relative overflow-hidden">
        {showConfetti && <ConfettiExplosion colors={confettiColors} />}
        {showSparkles && <SparkleStars color={primaryColor} />}
        <FloatingParticles color={primaryColor} count={15} />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-3xl font-bold text-green-500">TADA</span>
              <span className="text-lg text-muted-foreground">VTU</span>
            </Link>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border overflow-hidden shadow-2xl animate-scale-in">
            <div
              className="h-48 flex flex-col items-center justify-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <FloatingParticles color="rgba(255,255,255,0.3)" count={10} />
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <IonIcon name="checkmark-circle" size="48px" color="white" />
              </div>
              <p className="text-white font-bold text-lg">Gift Claimed!</p>
            </div>

            <div className="p-8 text-center space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="text-xl font-bold text-foreground">{gift.sender_name}</p>
              </div>

              {gift.personal_message && (
                <div className="bg-muted/30 rounded-2xl p-5 border border-border">
                  <IonIcon name="chatbubble-ellipses" size="20px" className="text-muted-foreground mb-2" />
                  <p className="text-foreground italic leading-relaxed">&ldquo;{gift.personal_message}&rdquo;</p>
                </div>
              )}

              <div className="py-6">
                <p className="text-sm text-muted-foreground mb-2">Gift amount</p>
                <p className="text-5xl font-black text-foreground animate-number-pop">
                  ₦{gift.amount.toLocaleString()}
                </p>
                <p className="text-muted-foreground mt-1">Airtime</p>
              </div>

              <div className="bg-green-500/10 rounded-2xl p-4 border border-green-500/20">
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <IonIcon name="checkmark-circle" size="24px" />
                  <span className="font-semibold">Sent to {gift.recipient_phone}</span>
                </div>
              </div>

              <Button asChild className="w-full h-12 rounded-xl font-semibold text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired gift
  if (expiry?.expired && stage === "preview") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-gray-900/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-gray-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <IonIcon name="time" size="40px" color="#6b7280" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Gift Expired</h2>
          <p className="text-muted-foreground mb-8">This gift has expired and can no longer be opened.</p>
          <Button asChild variant="outline" className="w-full h-12 rounded-xl font-semibold">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Main gift opening experience
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-950/20 flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && <ConfettiExplosion colors={confettiColors} />}
      {showSparkles && <SparkleStars color={primaryColor} />}
      <FloatingParticles color={primaryColor} count={15} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl font-bold text-green-500">TADA</span>
            <span className="text-lg text-muted-foreground">VTU</span>
          </Link>
        </div>

        {/* Gift Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border overflow-hidden shadow-2xl">
          
          {/* PREVIEW STAGE */}
          {stage === "preview" && (
            <div className="animate-fade-in">
              <div
                className="h-52 flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <FloatingParticles color="rgba(255,255,255,0.3)" count={10} />
                
                {/* Animated gift box */}
                <div className="relative group cursor-pointer" onClick={handleOpenGift}>
                  <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-gift-wiggle shadow-2xl transition-transform group-hover:scale-110">
                    <IonIcon name={occasionConfig?.icon || "gift"} size="56px" color="white" />
                  </div>
                  <GlowingRings color="rgba(255,255,255,0.3)" />
                  
                  {/* Tap hint */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-white/70 text-xs animate-pulse">Tap to open</span>
                  </div>
                </div>
                
                <p className="text-white font-semibold mt-10">{occasionConfig?.label || "Special"} Gift</p>
              </div>

              <div className="p-8 text-center space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">You have a gift!</h2>
                  <p className="text-muted-foreground">
                    From: <span className="font-semibold text-foreground">{gift.sender_name}</span>
                  </p>
                </div>

                {expiry && !expiry.expired && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full text-amber-500 text-sm">
                    <IonIcon name="time-outline" size="16px" />
                    <span>{expiry.message}</span>
                  </div>
                )}

                <div className="bg-muted/30 rounded-2xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Airtime will be sent to:</p>
                  <p className="font-bold text-foreground text-lg">{gift.recipient_phone}</p>
                </div>

                <Button
                  onClick={handleOpenGift}
                  className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-white"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 10px 40px -10px ${primaryColor}` }}
                >
                  <IonIcon name="gift" size="24px" className="mr-2" />
                  Open Gift
                </Button>
              </div>
            </div>
          )}


          {/* OPENING STAGE - Dramatic animation */}
          {stage === "opening" && (
            <div className="p-12 text-center animate-fade-in">
              <div className="relative w-36 h-36 mx-auto mb-8">
                {/* Pulsing background */}
                <div
                  className="absolute inset-0 rounded-3xl animate-pulse-scale"
                  style={{ backgroundColor: primaryColor, opacity: 0.3 }}
                />
                <div
                  className="absolute inset-2 rounded-2xl animate-pulse-scale-delayed"
                  style={{ backgroundColor: primaryColor, opacity: 0.5 }}
                />
                
                {/* Main gift icon */}
                <div
                  className="absolute inset-4 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  <IonIcon name={occasionConfig?.icon || "gift"} size="56px" color="white" className="animate-gift-shake" />
                </div>
                
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin-slow">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${i * 60}deg) translateX(70px) translateY(-50%)`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <p className="text-xl font-bold text-foreground animate-pulse">Opening your gift...</p>
              <p className="text-muted-foreground mt-2 text-sm">Something special is coming!</p>
              
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      backgroundColor: primaryColor,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* REVEALED STAGE - Celebration */}
          {stage === "revealed" && (
            <div className="animate-scale-in">
              <div
                className="h-52 flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <FloatingParticles color="rgba(255,255,255,0.4)" count={15} />
                
                <div className="relative">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl animate-success-pop">
                    <IonIcon name="checkmark-circle" size="56px" color="white" />
                  </div>
                  <GlowingRings color="rgba(255,255,255,0.4)" />
                </div>
                
                <p className="text-white font-bold text-xl mt-4">Gift Opened!</p>
              </div>

              <div className="p-8 text-center space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-xl font-bold text-foreground">{gift.sender_name}</p>
                </div>

                {gift.personal_message && (
                  <div className="bg-muted/30 rounded-2xl p-5 border border-border animate-slide-up">
                    <IonIcon name="chatbubble-ellipses" size="20px" className="text-muted-foreground mb-2" />
                    <p className="text-foreground italic leading-relaxed">&ldquo;{gift.personal_message}&rdquo;</p>
                  </div>
                )}

                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-2">You received</p>
                  <p className="text-5xl font-black text-foreground animate-number-pop">
                    ₦{gift.amount.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground mt-1">Airtime</p>
                </div>

                <div className="bg-green-500/10 rounded-2xl p-4 border border-green-500/20 animate-slide-up">
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <IonIcon name="checkmark-circle" size="24px" />
                    <span className="font-semibold">Sent to {gift.recipient_phone}!</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    asChild
                    className="flex-1 h-12 rounded-xl font-semibold text-white shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Link href="/dashboard">Done</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl font-semibold border-2"
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
                    <IonIcon name="share-social" size="20px" className="mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          )}

       
   {/* ERROR STAGE */}
          {stage === "error" && (
            <div className="p-8 text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto animate-shake">
                <IonIcon name="close-circle" size="48px" color="#ef4444" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Oops!</h2>
                <p className="text-muted-foreground">{openError}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStage("preview")}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold border-2"
                >
                  Try Again
                </Button>
                <Button asChild className="flex-1 h-12 bg-green-500 hover:bg-green-600 rounded-xl font-semibold">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by <span className="text-green-500 font-semibold">TADA VTU</span> • Nigeria&apos;s favorite recharge platform
        </p>
      </div>
    </div>
  );
}
