"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  OCCASION_CONFIG,
  GIFT_AMOUNTS,
  getThemesByOccasion,
  getGiftStatusDisplay,
} from "@/lib/gift-cards";
import { AiMessageGenerator } from "@/components/ai-message-generator";
import { ShareGiftModal } from "@/components/share-gift-modal";
import { GiftLivePreview } from "@/components/gift-live-preview";
import type { GiftCard, GiftOccasion } from "@/types/database";

// Floating particles for background ambiance
function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            backgroundColor: color,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 8 + 12}s`,
          }}
        />
      ))}
    </div>
  );
}

// Success confetti burst
function SuccessConfetti() {
  const colors = ["#22c55e", "#10b981", "#059669", "#34d399", "#6ee7b7"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(40)].map((_, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={i}
            className="absolute animate-confetti-burst"
            style={{
              left: `${50 + (Math.random() - 0.5) * 30}%`,
              top: "50%",
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animationDelay: `${Math.random() * 0.3}s`,
              "--tx": `${(Math.random() - 0.5) * 400}px`,
              "--ty": `${Math.random() * -500 - 100}px`,
              "--r": `${Math.random() * 720}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

export default function SendGiftPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"send" | "sent" | "received">("send");
  const [sentGifts, setSentGifts] = useState<GiftCard[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastGiftId, setLastGiftId] = useState<string | null>(null);

  // Form state
  const [step, setStep] = useState(1);
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Recipient lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipientLookup, setRecipientLookup] = useState<{
    found: boolean;
    name?: string;
    checked: boolean;
  } | null>(null);

  const occasions = Object.entries(OCCASION_CONFIG) as [
    GiftOccasion,
    { label: string; icon: string; color: string }
  ][];

  const fetchGifts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();

    const { data: sent } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: receivedById } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    let receivedByEmail: GiftCard[] = [];
    if (user.email) {
      const { data } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("recipient_email", user.email)
        .is("recipient_user_id", null)
        .order("created_at", { ascending: false })
        .limit(20);
      receivedByEmail = (data as GiftCard[]) || [];
    }

    const allReceived: GiftCard[] = [
      ...((receivedById as GiftCard[]) || []),
      ...receivedByEmail,
    ];
    const received = allReceived
      .filter((gift, index, self) => index === self.findIndex((g) => g.id === gift.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    setSentGifts((sent as GiftCard[]) || []);
    setReceivedGifts(received);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchGifts();
  }, [user, fetchGifts]);

  // Lookup recipient by email
  const lookupRecipient = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecipientLookup(null);
      return;
    }
    setLookupLoading(true);
    try {
      const response = await fetch("/api/users/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (result.status) {
        setRecipientLookup({
          found: result.found,
          name: result.user?.name,
          checked: true,
        });
      } else {
        setRecipientLookup({ found: false, checked: true });
      }
    } catch {
      setRecipientLookup({ found: false, checked: true });
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientEmail && step === 3) {
        lookupRecipient(recipientEmail);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [recipientEmail, step]);

  const handleEmailChange = (email: string) => {
    setRecipientEmail(email);
    if (recipientLookup?.checked) setRecipientLookup(null);
  };

  const handleOccasionSelect = (occ: GiftOccasion) => {
    setSelectedOccasion(occ);
    const themes = getThemesByOccasion(occ);
    if (themes.length > 0) setSelectedThemeId(themes[0].id);
    setStep(2);
  };

  const validateAndProceed = () => {
    const numAmount = parseInt(amount);
    if (!amount || numAmount < 100) {
      toast.warning("Minimum amount is ₦100");
      return;
    }
    if (numAmount > 50000) {
      toast.warning("Maximum amount is ₦50,000");
      return;
    }
    if (numAmount > (profile?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }
    setStep(3);
  };

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.warning("Please enter a valid email address");
      return;
    }
    if (!/^0[789][01]\d{8}$/.test(recipientPhone)) {
      toast.warning("Invalid phone number format");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/gifts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          senderName: profile?.full_name || "Someone special",
          recipient_email: recipientEmail,
          recipient_phone: recipientPhone,
          service_type: "airtime",
          amount: parseInt(amount),
          occasion: selectedOccasion,
          theme_id: selectedThemeId,
          personal_message: personalMessage || undefined,
        }),
      });

      const result = await response.json();
      if (result.status) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        await refreshProfile();
        await fetchGifts();
        toast.payment("Gift sent successfully!", `₦${parseInt(amount).toLocaleString()} gift card created`);
        
        // Show share modal
        setLastGiftId(result.data?.id || null); // Assuming API returns the gift object
        setShowShareModal(true);

        setStep(1);
        setSelectedOccasion(null);
        setAmount("");
        setRecipientEmail("");
        setRecipientPhone("");
        setPersonalMessage("");
        setRecipientLookup(null);
        setActiveTab("sent");
      } else {
        toast.error(result.message || "Failed to send gift");
      }
    } catch {
      toast.error("Network error", "Please try again");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleCancelGift = async (giftId: string) => {
    if (!confirm("Cancel this gift? The amount will be refunded.")) return;
    setActionLoading(giftId);
    try {
      const response = await fetch(`/api/gifts/${giftId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const result = await response.json();
      if (result.status) {
        toast.success("Gift cancelled", { description: `₦${result.data.refundAmount.toLocaleString()} refunded` });
        await refreshProfile();
        await fetchGifts();
      } else {
        toast.error(result.message || "Failed to cancel gift");
      }
    } catch {
      toast.error("Failed to cancel gift");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendEmail = async (giftId: string) => {
    setActionLoading(giftId);
    try {
      const response = await fetch(`/api/gifts/${giftId}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const result = await response.json();
      if (result.status) {
        toast.success("Email sent!");
      } else {
        toast.error(result.message || "Failed to resend");
      }
    } catch {
      toast.error("Failed to resend email");
    } finally {
      setActionLoading(null);
    }
  };

  const occasionColor = selectedOccasion ? OCCASION_CONFIG[selectedOccasion].color : "#22c55e";

  // Handle claiming received gifts
  const handleClaimGift = async (giftId: string) => {
    setActionLoading(giftId);
    try {
      const response = await fetch(`/api/gifts/${giftId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const result = await response.json();
      if (result.status) {
        toast.success("Gift claimed!", { 
          description: `₦${result.data.amount.toLocaleString()} added to your wallet` 
        });
        await refreshProfile();
        await fetchGifts();
      } else {
        toast.error(result.message || "Failed to claim gift");
      }
    } catch {
      toast.error("Failed to claim gift");
    } finally {
      setActionLoading(null);
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/gift/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-pink-950/10">
      {showConfetti && <SuccessConfetti />}

      {/* Share Modal */}
      {showShareModal && lastGiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="checkmark-circle" size="32px" className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gift Sent!</h3>
              <p className="text-muted-foreground text-sm">
                Share the link with {recipientEmail || recipientPhone}
              </p>
            </div>

            <div className="bg-muted p-3 rounded-xl flex items-center gap-2 mb-6">
              <div className="flex-1 truncate text-sm font-mono text-muted-foreground">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/gift/${lastGiftId}`}
              </div>
              <Button size="sm" variant="ghost" onClick={() => copyLink(lastGiftId)}>
                <IonIcon name="copy-outline" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowShareModal(false)}>
                Close
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  const link = `${window.location.origin}/gift/${lastGiftId}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`I sent you a gift on TADA VTU! Open it here: ${link}`)}`, '_blank');
                }}
              >
                <IonIcon name="logo-whatsapp" className="mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-16 px-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-xl transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="22px" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <IonIcon name="gift" size="22px" color="white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Gift Cards</h1>
                <p className="text-xs text-muted-foreground">Send love with airtime</p>
              </div>
            </div>
          </div>
          <div className="text-right bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className="font-bold text-green-500">₦{(profile?.balance || 0).toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Premium Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-card/50 backdrop-blur rounded-2xl border border-border mb-6 shadow-lg">
              {(["send", "sent", "received"] as const).map((tab) => {
                const isActive = activeTab === tab;
                const icons = { send: "gift", sent: "paper-plane", received: "download" };
                const colors = { send: "#22c55e", sent: "#3b82f6", received: "#f59e0b" };
                const counts = { send: 0, sent: sentGifts.length, received: receivedGifts.length };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-smooth ${
                      isActive
                        ? "bg-card text-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    }`}
                  >
                    <IonIcon
                      name={isActive ? icons[tab] : `${icons[tab]}-outline`}
                      size="20px"
                      color={isActive ? colors[tab] : undefined}
                    />
                    <span className="capitalize">{tab}</span>
                    {counts[tab] > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: isActive ? `${colors[tab]}20` : "transparent",
                          color: isActive ? colors[tab] : "inherit",
                        }}
                      >
                        {counts[tab]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

        {/* SEND TAB */}
        {activeTab === "send" && (
          <div className="bg-card/50 backdrop-blur rounded-3xl border border-border p-6 shadow-xl relative overflow-hidden">
            <FloatingParticles color={occasionColor} />
            
            <form onSubmit={handleSendGift} className="relative z-10 space-y-6">
              {/* Step 1: Occasion Selection */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30 animate-gift-float">
                      <IonIcon name="gift" size="32px" color="white" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">What&apos;s the occasion?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Choose a theme for your gift</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {occasions.map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOccasionSelect(key)}
                        className="group p-4 rounded-2xl border-2 border-border hover:border-green-500/50 bg-card/50 hover:bg-gradient-to-br hover:from-card hover:to-muted/50 transition-smooth text-left active:scale-95 hover:shadow-lg"
                      >
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <IonIcon name={config.icon} size="28px" color={config.color} />
                        </div>
                        <p className="font-bold text-foreground group-hover:text-green-500 transition-colors">
                          {config.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

    
          {/* Step 2: Amount Selection */}
              {step === 2 && (
                <div className="space-y-6 animate-slide-up">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IonIcon name="arrow-back" size="18px" />
                    Back
                  </button>

                  <div className="text-center">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-gift-wiggle"
                      style={{ backgroundColor: `${occasionColor}20` }}
                    >
                      <IonIcon
                        name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"}
                        size="40px"
                        color={occasionColor}
                      />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label} Gift
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">How much would you like to send?</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-foreground">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GIFT_AMOUNTS.map((amt) => {
                        const isDisabled = amt.value > (profile?.balance || 0);
                        const isSelected = amount === amt.value.toString();
                        return (
                          <button
                            key={amt.value}
                            type="button"
                            onClick={() => setAmount(amt.value.toString())}
                            disabled={isDisabled}
                            className={`relative p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20"
                                : isDisabled
                                ? "border-border/30 bg-muted/20 opacity-40 cursor-not-allowed"
                                : "border-border hover:border-pink-500/50 hover:bg-pink-500/5 active:scale-95"
                            }`}
                          >
                            <p className={`text-lg font-bold ${isSelected ? "text-pink-500" : "text-foreground"}`}>
                              {amt.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-xs text-muted-foreground">or custom amount</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-xl">₦</span>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-12 h-16 bg-card border-2 border-border focus:border-pink-500 text-2xl font-bold rounded-xl"
                        min="100"
                        max="50000"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: ₦100 • Max: ₦50,000</span>
                      <span className="text-green-500 font-semibold">
                        Balance: ₦{(profile?.balance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={validateAndProceed}
                    disabled={!amount || parseInt(amount) < 100}
                    className="w-full h-14 rounded-xl font-bold text-lg text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${occasionColor}, ${occasionColor}dd)`,
                      boxShadow: `0 10px 40px -10px ${occasionColor}`,
                    }}
                  >
                    {!amount || parseInt(amount) < 100 ? (
                      "Enter amount to continue"
                    ) : (
                      <span className="flex items-center gap-2">
                        Continue with ₦{parseInt(amount).toLocaleString()}
                        <IonIcon name="arrow-forward" size="20px" />
                      </span>
                    )}
                  </Button>
                </div>
              )}

 
             {/* Step 3: Recipient Details */}
              {step === 3 && (
                <div className="space-y-5 animate-slide-up">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IonIcon name="arrow-back" size="18px" />
                    Back
                  </button>

                  {/* Amount Preview Card */}
                  <div
                    className="text-center py-6 rounded-2xl border-2 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${occasionColor}15, ${occasionColor}05)`,
                      borderColor: `${occasionColor}30`,
                    }}
                  >
                    <FloatingParticles color={occasionColor} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <IonIcon
                          name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"}
                          size="24px"
                          color={occasionColor}
                        />
                        <p className="text-4xl font-black text-foreground">₦{parseInt(amount).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label} Gift Card
                      </p>
                    </div>
                  </div>

                  {/* Recipient Email */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IonIcon name="mail" size="16px" color={occasionColor} />
                      Recipient&apos;s Email
                    </Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={recipientEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={`h-14 pl-4 pr-12 rounded-xl border-2 text-lg ${
                          recipientLookup?.checked
                            ? recipientLookup.found
                              ? "border-green-500 bg-green-500/5"
                              : "border-yellow-500 bg-yellow-500/5"
                            : "border-border focus:border-pink-500"
                        }`}
                        required
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {lookupLoading ? (
                          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        ) : recipientLookup?.checked ? (
                          recipientLookup.found ? (
                            <IonIcon name="checkmark-circle" size="24px" className="text-green-500" />
                          ) : (
                            <IonIcon name="alert-circle" size="24px" className="text-yellow-500" />
                          )
                        ) : null}
                      </div>
                    </div>

                    {/* Verification Result */}
                    {recipientLookup?.checked && (
                      <div
                        className={`flex items-center gap-3 p-3 rounded-xl animate-scale-in ${
                          recipientLookup.found
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-yellow-500/10 border border-yellow-500/30"
                        }`}
                      >
                        <IonIcon
                          name={recipientLookup.found ? "person-circle" : "person-add"}
                          size="24px"
                          className={recipientLookup.found ? "text-green-500" : "text-yellow-500"}
                        />
                        <div>
                          <p className={`font-bold ${recipientLookup.found ? "text-green-500" : "text-yellow-600"}`}>
                            {recipientLookup.found ? recipientLookup.name : "Not a TADA user yet"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {recipientLookup.found ? "TADA VTU User ✓" : "They'll receive an invite"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IonIcon name="call" size="16px" color={occasionColor} />
                      Phone Number (for airtime)
                    </Label>
                    <Input
                      type="tel"
                      placeholder="08012345678"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="h-14 rounded-xl border-2 border-border focus:border-pink-500 text-lg"
                      maxLength={11}
                      required
                    />
                  </div>

                  {/* Personal Message */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IonIcon name="chatbubble-ellipses" size="16px" color={occasionColor} />
                      Personal Message
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    
                    {/* AI Message Generator */}
                    <AiMessageGenerator
                      senderName={profile?.full_name || "Someone special"}
                      recipientName={recipientLookup?.name}
                      occasion={selectedOccasion || "custom"}
                      amount={parseInt(amount) || 0}
                      onGenerate={(message) => setPersonalMessage(message)}
                      disabled={!selectedOccasion || !amount}
                    />
                    
                    <textarea
                      placeholder="Write something special... 💝"
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      className="w-full h-28 px-4 py-3 rounded-xl border-2 border-border focus:border-green-500 bg-card text-foreground resize-none focus:outline-none transition-colors"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{personalMessage.length}/500</p>
                  </div>

  
                {/* Summary Card */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <IonIcon name="receipt" size="20px" color={occasionColor} />
                      Summary
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Occasion</span>
                        <span className="font-semibold flex items-center gap-1">
                          <IonIcon
                            name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"}
                            size="16px"
                            color={occasionColor}
                          />
                          {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To</span>
                        <div className="text-right">
                          {recipientLookup?.found && (
                            <span className="font-bold text-green-500 block">{recipientLookup.name}</span>
                          )}
                          <span className="text-muted-foreground text-xs">{recipientEmail || "—"}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-semibold">{recipientPhone || "—"}</span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Total</span>
                          <span className="text-2xl font-black" style={{ color: occasionColor }}>
                            ₦{parseInt(amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="lg:hidden">
                    <GiftLivePreview
                      occasion={selectedOccasion}
                      themeId={selectedThemeId}
                      amount={amount}
                      senderName={profile?.full_name || "Someone special"}
                      recipientEmail={recipientEmail}
                      personalMessage={personalMessage}
                    />
                  </div>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={!recipientEmail || !recipientPhone || isProcessing}
                    className="w-full h-16 rounded-xl font-bold text-lg text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${occasionColor}, ${occasionColor}dd)`,
                      boxShadow: `0 10px 40px -10px ${occasionColor}`,
                    }}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Gift...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IonIcon name="gift" size="24px" />
                        Send Gift Card
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </div>
        )}


        {/* SENT TAB */}
        {activeTab === "sent" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Loading sent gifts...</p>
              </div>
            ) : sentGifts.length === 0 ? (
              <div className="bg-card/50 backdrop-blur rounded-3xl border border-border p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-gift-float">
                  <IonIcon name="paper-plane-outline" size="48px" color="#3b82f6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No gifts sent yet</h3>
                <p className="text-muted-foreground mb-6">Spread joy by sending your first gift!</p>
                <Button
                  onClick={() => setActiveTab("send")}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-lg"
                >
                  <IonIcon name="gift" size="20px" className="mr-2" />
                  Send Your First Gift
                </Button>
              </div>
            ) : (
              sentGifts.map((gift, index) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canCancel = gift.status === "scheduled" || gift.status === "delivered";
                const canResend = gift.status === "delivered";
                const isLoading = actionLoading === gift.id;

                return (
                  <div
                    key={gift.id}
                    className="bg-card/50 backdrop-blur rounded-2xl border border-border p-5 hover:border-blue-500/50 hover:shadow-lg transition-all animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{ backgroundColor: `${config?.color || "#3b82f6"}20` }}
                      >
                        <IonIcon name={config?.icon || "gift"} size="32px" color={config?.color || "#3b82f6"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-foreground">{config?.label || "Gift"}</p>
                            <p className="text-sm text-muted-foreground truncate">To: {gift.recipient_email}</p>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                              gift.status === "credited"
                                ? "bg-green-500/20 text-green-500"
                                : gift.status === "delivered"
                                ? "bg-blue-500/20 text-blue-500"
                                : gift.status === "cancelled"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                            }`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">₦{gift.amount.toLocaleString()}</span>
                          <span className="flex items-center gap-1">
                            <IonIcon name="calendar-outline" size="14px" />
                            {formatDate(gift.created_at)}
                          </span>
                        </div>
                        {gift.personal_message && (
                          <p className="text-xs text-muted-foreground mt-3 italic bg-muted/30 p-2 rounded-lg line-clamp-2">
                            &ldquo;{gift.personal_message}&rdquo;
                          </p>
                        )}
                        {(canCancel || canResend) && (
                          <div className="flex gap-3 mt-4 pt-3 border-t border-border">
                            {canResend && (
                              <button
                                onClick={() => handleResendEmail(gift.id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <IonIcon name="mail" size="14px" />
                                )}
                                Resend Email
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => handleCancelGift(gift.id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 ml-auto"
                              >
                                <IonIcon name="close-circle" size="14px" />
                                Cancel & Refund
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* RECEIVED TAB */}
        {activeTab === "received" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Loading received gifts...</p>
              </div>
            ) : receivedGifts.length === 0 ? (
              <div className="bg-card/50 backdrop-blur rounded-3xl border border-border p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-gift-float">
                  <IonIcon name="gift-outline" size="48px" color="#f59e0b" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No gifts received yet</h3>
                <p className="text-muted-foreground mb-6">When someone sends you a gift, it will appear here!</p>
                <Button
                  onClick={() => setActiveTab("send")}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
                >
                  <IonIcon name="gift" size="20px" className="mr-2" />
                  Send a Gift Instead
                </Button>
              </div>
            ) : (
              receivedGifts.map((gift, index) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canClaim = gift.status === "delivered" && !gift.opened_at;
                const isExpired = gift.status === "expired";
                const isClaimed = gift.status === "credited";
                const isLoading = actionLoading === gift.id;

                return (
                  <div
                    key={gift.id}
                    className="bg-card/50 backdrop-blur rounded-2xl border border-border p-5 hover:border-amber-500/50 hover:shadow-lg transition-smooth animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{ backgroundColor: `${config?.color || "#f59e0b"}20` }}
                      >
                        <IonIcon name={config?.icon || "gift"} size="32px" color={config?.color || "#f59e0b"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-foreground">{config?.label || "Gift"}</p>
                            <p className="text-sm text-muted-foreground">From: {gift.sender_name}</p>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                              isClaimed
                                ? "bg-green-500/20 text-green-500"
                                : canClaim
                                ? "bg-amber-500/20 text-amber-500"
                                : isExpired
                                ? "bg-red-500/20 text-red-500"
                                : "bg-blue-500/20 text-blue-500"
                            }`}
                          >
                            {isClaimed ? "Claimed" : canClaim ? "Ready to Claim" : status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">₦{gift.amount.toLocaleString()}</span>
                          <span className="flex items-center gap-1">
                            <IonIcon name="calendar-outline" size="14px" />
                            {formatDate(gift.created_at)}
                          </span>
                        </div>
                        {gift.personal_message && (
                          <p className="text-xs text-muted-foreground mt-3 italic bg-muted/30 p-2 rounded-lg line-clamp-2">
                            &ldquo;{gift.personal_message}&rdquo;
                          </p>
                        )}
                        {canClaim && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <Button
                              onClick={() => handleClaimGift(gift.id)}
                              disabled={isLoading}
                              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg transition-smooth"
                            >
                              {isLoading ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Claiming...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <IonIcon name="gift" size="16px" />
                                  Claim Gift
                                </div>
                              )}
                            </Button>
                          </div>
                        )}
                        {isClaimed && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-green-500 text-sm">
                              <IonIcon name="checkmark-circle" size="16px" />
                              <span>Gift claimed successfully!</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
          </div>

          {/* Desktop Sidebar - Live Preview */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {activeTab === "send" && step >= 2 && (
                <GiftLivePreview
                  occasion={selectedOccasion}
                  themeId={selectedThemeId}
                  amount={amount}
                  senderName={profile?.full_name || "Someone special"}
                  recipientEmail={recipientEmail}
                  personalMessage={personalMessage}
                />
              )}
              
              {activeTab !== "send" && (
                <div className="bg-card/50 backdrop-blur rounded-2xl border border-border p-6 text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IonIcon name="gift-outline" size="32px" className="text-green-500" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">TADA Gift Cards</h3>
                  <p className="text-sm text-muted-foreground">
                    Send love with airtime gifts. Fast, secure, and personal.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && lastGiftId && (
        <ShareGiftModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          giftId={lastGiftId}
          recipientEmail={recipientEmail}
          amount={parseInt(amount) || 0}
          occasion={selectedOccasion || "custom"}
        />
      )}
    </div>
  );
}