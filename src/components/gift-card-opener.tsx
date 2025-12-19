"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { getThemeById, getExpiryCountdown } from "@/lib/gift-cards";
import type { GiftCard } from "@/types/database";

interface GiftCardOpenerProps {
  gift: GiftCard;
  onOpen: () => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

type Stage = "preview" | "opening" | "revealed" | "error";

export function GiftCardOpener({ gift, onOpen, onClose }: GiftCardOpenerProps) {
  const [stage, setStage] = useState<Stage>("preview");
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const theme = getThemeById(gift.theme_id);
  const expiry = getExpiryCountdown(gift.expires_at);

  useEffect(() => {
    if (stage === "revealed") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleOpen = async () => {
    setStage("opening");
    
    // Simulate opening animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await onOpen();
    
    if (result.success) {
      setStage("revealed");
    } else {
      setError(result.error || "Failed to open gift");
      setStage("error");
    }
  };

  // Confetti animation component
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: theme?.primaryColor || "#22c55e",
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
    </div>
  );

  if (expiry.expired && stage === "preview") {
    return (
      <Card className="border-border max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IonIcon name="time-outline" size="40px" className="text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Gift Expired</h2>
          <p className="text-muted-foreground mb-4">
            This gift has expired and can no longer be opened.
          </p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showConfetti && <Confetti />}
      
      <Card className="border-border max-w-md mx-auto overflow-hidden">
        {/* Preview Stage - Gift Box */}
        {stage === "preview" && (
          <CardContent className="p-0">
            {/* Gradient header */}
            <div 
              className="h-32 flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme?.primaryColor || "#22c55e"}, ${theme?.secondaryColor || "#10b981"})` 
              }}
            >
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                <IonIcon name={theme?.icon || "gift"} size="48px" color="white" />
              </div>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                You have a gift!
              </h2>
              <p className="text-muted-foreground">
                From: <span className="font-medium text-foreground">{gift.sender_name}</span>
              </p>
              
              {!expiry.expired && (
                <p className="text-sm text-amber-500">
                  <IonIcon name="time-outline" size="14px" className="inline mr-1" />
                  {expiry.message}
                </p>
              )}
              
              {/* Show destination phone */}
              {gift.recipient_phone && (
                <p className="text-sm text-muted-foreground">
                  Airtime will be sent to: <span className="font-medium text-foreground">{gift.recipient_phone}</span>
                </p>
              )}
              
              <Button 
                onClick={handleOpen}
                className="w-full h-12 text-lg"
                style={{ backgroundColor: theme?.primaryColor || "#22c55e" }}
              >
                <IonIcon name="gift" size="20px" className="mr-2" />
                Open Gift
              </Button>
            </div>
          </CardContent>
        )}

        {/* Opening Animation */}
        {stage === "opening" && (
          <CardContent className="p-8 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div 
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{ backgroundColor: theme?.primaryColor || "#22c55e" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <IonIcon name={theme?.icon || "gift"} size="64px" color="white" className="animate-bounce" />
              </div>
            </div>
            <p className="text-lg font-medium text-foreground animate-pulse">
              Opening your gift...
            </p>
          </CardContent>
        )}

        {/* Revealed Stage */}
        {stage === "revealed" && (
          <CardContent className="p-0">
            {/* Celebration header */}
            <div 
              className="h-40 flex flex-col items-center justify-center relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${theme?.primaryColor || "#22c55e"}, ${theme?.secondaryColor || "#10b981"})` 
              }}
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                <IonIcon name={theme?.icon || "gift"} size="40px" color="white" />
              </div>
              <p className="text-white/90 text-sm font-medium">
                {theme?.name || "Special Gift"}
              </p>
            </div>
            
            <div className="p-6 text-center space-y-4">
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
                <p className="text-4xl font-bold text-foreground">
                  ₦{gift.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {gift.service_type === "airtime" ? "Airtime" : "Data"}
                </p>
              </div>
              
              <div className="bg-green-500/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <IonIcon name="checkmark-circle" size="20px" />
                  <span className="font-medium">Sent to {gift.recipient_phone}!</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={onClose}
                  className="flex-1"
                  style={{ backgroundColor: theme?.primaryColor || "#22c55e" }}
                >
                  Done
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Share functionality
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
            </div>
          </CardContent>
        )}

        {/* Error Stage */}
        {stage === "error" && (
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <IonIcon name="close-circle" size="40px" className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => setStage("preview")} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={onClose} className="flex-1 bg-green-500 hover:bg-green-600">
                Close
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}

// Compact gift card preview for lists
export function GiftCardPreview({ 
  gift, 
  onClick 
}: { 
  gift: GiftCard; 
  onClick: () => void;
}) {
  const theme = getThemeById(gift.theme_id);
  const expiry = getExpiryCountdown(gift.expires_at);
  
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl border border-border hover:border-green-500 transition-all text-left flex items-center gap-4"
    >
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${theme?.primaryColor}20` || "#22c55e20" }}
      >
        <IonIcon name={theme?.icon || "gift"} size="28px" color={theme?.primaryColor || "#22c55e"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          From {gift.sender_name}
        </p>
        <p className="text-sm text-muted-foreground">
          ₦{gift.amount.toLocaleString()} {gift.service_type}
        </p>
      </div>
      <div className="text-right">
        {gift.status === "delivered" && !expiry.expired && (
          <span className="text-xs text-amber-500">{expiry.message}</span>
        )}
        {gift.status === "opened" && (
          <span className="text-xs text-green-500">Opened</span>
        )}
        {expiry.expired && (
          <span className="text-xs text-gray-500">Expired</span>
        )}
      </div>
    </button>
  );
}
