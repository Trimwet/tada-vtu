"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { GiftCard, GiftOccasion } from "@/types/database";

export default function SendGiftPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"send" | "sent" | "received">("send");
  const [sentGifts, setSentGifts] = useState<GiftCard[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState(false);
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
      if (recipientEmail) {
        lookupRecipient(recipientEmail);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [recipientEmail]);

  const handleEmailChange = (email: string) => {
    setRecipientEmail(email);
    if (recipientLookup?.checked) setRecipientLookup(null);
  };

  const handleOccasionSelect = (occ: GiftOccasion) => {
    setSelectedOccasion(occ);
    const themes = getThemesByOccasion(occ);
    if (themes.length > 0) setSelectedThemeId(themes[0].id);
  };

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
    setCustomAmount(false);
  };

  const isFormValid = selectedOccasion && amount && parseInt(amount) >= 100 && recipientEmail && recipientPhone;
  const insufficientBalance = parseInt(amount) > (profile?.balance || 0);


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
    if (insufficientBalance) {
      toast.error("Insufficient balance");
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
        await refreshProfile();
        await fetchGifts();
        toast.success("Gift sent successfully!");
        
        // Reset form
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
      toast.error("Network error. Please try again");
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
        toast.success("Gift cancelled and refunded");
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
        toast.success("Gift claimed successfully!");
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

  const numAmount = parseInt(amount) || 0;
  const occasionConfig = selectedOccasion ? OCCASION_CONFIG[selectedOccasion] : null;


  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-xl transition-smooth lg:hidden">
              <IonIcon name="arrow-back-outline" size="22px" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Gift Cards</h1>
              <p className="text-xs text-muted-foreground">Send airtime gifts</p>
            </div>
          </div>
          <div className="bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
            <p className="font-bold text-green-500">₦{(profile?.balance || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6 border-t border-border/50">
          {(["send", "sent", "received"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const counts = { send: 0, sent: sentGifts.length, received: receivedGifts.length };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium capitalize transition-smooth relative ${
                  isActive ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {counts[tab] > 0 && (
                  <span className="ml-1.5 text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full">
                    {counts[tab]}
                  </span>
                )}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </header>

      <
main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* SEND TAB */}
        {activeTab === "send" && (
          <form onSubmit={handleSendGift} className="space-y-6">
            {/* Occasion Selector - Horizontal Scroll */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Select Occasion</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                {occasions.map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleOccasionSelect(key)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-w-[90px] ${
                      selectedOccasion === key
                        ? "border-green-500 bg-green-500/10"
                        : "border-border bg-card hover:border-green-500/50"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <IonIcon name={config.icon} size="24px" color={config.color} />
                    </div>
                    <span className={`text-xs font-medium ${selectedOccasion === key ? "text-green-500" : "text-foreground"}`}>
                      {config.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>


            {/* Amount Selector */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Select Amount</h3>
              <div className="grid grid-cols-3 gap-2">
                {GIFT_AMOUNTS.map((amt) => {
                  const isSelected = amount === amt.value.toString() && !customAmount;
                  const isDisabled = amt.value > (profile?.balance || 0);
                  return (
                    <button
                      key={amt.value}
                      type="button"
                      onClick={() => handleAmountSelect(amt.value)}
                      disabled={isDisabled}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                        isSelected
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                          : isDisabled
                          ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                          : "bg-card border border-border text-foreground hover:border-green-500/50"
                      }`}
                    >
                      {amt.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Custom Amount */}
              <button
                type="button"
                onClick={() => setCustomAmount(true)}
                className={`w-full py-3 rounded-xl border-2 border-dashed transition-all ${
                  customAmount ? "border-green-500 bg-green-500/5" : "border-border hover:border-green-500/50"
                }`}
              >
                <span className="text-sm text-muted-foreground">Custom amount</span>
              </button>
              
              {customAmount && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">₦</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 h-12 text-lg font-semibold"
                    min="100"
                    max="50000"
                    autoFocus
                  />
                </div>
              )}
              
              {/* Balance Warning */}
              {insufficientBalance && amount && (
                <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <IonIcon name="warning" size="18px" className="text-orange-500" />
                  <span className="text-sm text-orange-500">Insufficient balance</span>
                  <Link href="/dashboard/fund-wallet" className="ml-auto text-sm font-semibold text-green-500">
                    Top Up →
                  </Link>
                </div>
              )}
            </div>


            {/* Recipient Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Recipient Details</h3>
              
              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`h-12 pr-10 ${
                      recipientLookup?.checked
                        ? recipientLookup.found
                          ? "border-green-500 focus:border-green-500"
                          : "border-yellow-500 focus:border-yellow-500"
                        : ""
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {lookupLoading ? (
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : recipientLookup?.checked ? (
                      recipientLookup.found ? (
                        <IonIcon name="checkmark-circle" size="20px" className="text-green-500" />
                      ) : (
                        <IonIcon name="alert-circle" size="20px" className="text-yellow-500" />
                      )
                    ) : null}
                  </div>
                </div>
                {recipientLookup?.checked && (
                  <p className={`text-xs ${recipientLookup.found ? "text-green-500" : "text-yellow-500"}`}>
                    {recipientLookup.found 
                      ? `✓ ${recipientLookup.name} is on TADA`
                      : "Not a TADA user yet - they'll get an invite"
                    }
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Phone Number (for airtime)</label>
                <Input
                  type="tel"
                  placeholder="08012345678"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="h-12"
                  maxLength={11}
                  required
                />
              </div>
            </div>

    
        {/* Personal Message with AI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Personal Message</h3>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              
              {/* AI Generator */}
              {selectedOccasion && numAmount >= 100 && (
                <AiMessageGenerator
                  senderName={profile?.full_name || "Someone special"}
                  recipientName={recipientLookup?.name}
                  occasion={selectedOccasion}
                  amount={numAmount}
                  onGenerate={(message) => setPersonalMessage(message)}
                />
              )}
              
              <div className="relative">
                <textarea
                  placeholder="Write something special..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-green-500 focus:outline-none resize-none"
                  maxLength={500}
                />
                <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {personalMessage.length}/500
                </span>
              </div>
            </div>

      
      {/* Live Preview Card */}
            {(selectedOccasion || numAmount > 0) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <IonIcon name="eye-outline" size="16px" className="text-green-500" />
                  Preview
                </h3>
                <div 
                  className="relative rounded-2xl p-6 border-2 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${occasionConfig?.color || '#22c55e'}15, ${occasionConfig?.color || '#22c55e'}05)`,
                    borderColor: `${occasionConfig?.color || '#22c55e'}30`,
                  }}
                >
                  <div className="text-center space-y-4">
                    {/* Icon */}
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                      style={{ backgroundColor: `${occasionConfig?.color || '#22c55e'}20` }}
                    >
                      <IonIcon 
                        name={occasionConfig?.icon || "gift"} 
                        size="32px" 
                        color={occasionConfig?.color || '#22c55e'} 
                      />
                    </div>
                    
                    {/* Amount */}
                    <div>
                      <p className="text-3xl font-black text-foreground">
                        ₦{numAmount.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {occasionConfig?.label || 'Gift'} Card
                      </p>
                    </div>
                    
                    {/* Message Preview */}
                    {personalMessage && (
                      <div className="bg-card/50 rounded-xl p-3 text-left">
                        <p className="text-xs text-muted-foreground mb-1">Message</p>
                        <p className="text-sm text-foreground italic">"{personalMessage}"</p>
                      </div>
                    )}
                    
                    {/* From/To */}
                    <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>From: {profile?.full_name || 'You'}</span>
                      <span>To: {recipientEmail || 'Recipient'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}


        {/* SENT TAB */}
        {activeTab === "sent" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4 text-sm">Loading...</p>
              </div>
            ) : sentGifts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="gift-outline" size="40px" className="text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No gifts sent yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Start spreading joy!</p>
                <Button onClick={() => setActiveTab("send")} className="bg-green-500 hover:bg-green-600">
                  Send Your First Gift
                </Button>
              </div>
            ) : (
              sentGifts.map((gift) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canCancel = gift.status === "scheduled" || gift.status === "delivered";
                const isLoading = actionLoading === gift.id;

                return (
                  <div key={gift.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config?.color || '#22c55e'}20` }}
                      >
                        <IonIcon name={config?.icon || "gift"} size="24px" color={config?.color || '#22c55e'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-foreground">{config?.label || "Gift"}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            gift.status === "credited" ? "bg-green-500/20 text-green-500" :
                            gift.status === "delivered" ? "bg-blue-500/20 text-blue-500" :
                            gift.status === "cancelled" ? "bg-red-500/20 text-red-500" :
                            "bg-yellow-500/20 text-yellow-500"
                          }`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">To: {gift.recipient_email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-semibold text-foreground">₦{gift.amount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(gift.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {canCancel && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => handleCancelGift(gift.id)}
                          disabled={isLoading}
                          className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                        >
                          {isLoading ? "Cancelling..." : "Cancel & Refund"}
                        </button>
                      </div>
                    )}
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
                <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4 text-sm">Loading...</p>
              </div>
            ) : receivedGifts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="gift-outline" size="40px" className="text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No gifts received</h3>
                <p className="text-sm text-muted-foreground">When someone sends you a gift, it appears here!</p>
              </div>
            ) : (
              receivedGifts.map((gift) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canClaim = gift.status === "delivered" && !gift.opened_at;
                const isClaimed = gift.status === "credited";
                const isLoading = actionLoading === gift.id;

                return (
                  <div key={gift.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config?.color || '#22c55e'}20` }}
                      >
                        <IonIcon name={config?.icon || "gift"} size="24px" color={config?.color || '#22c55e'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-foreground">{config?.label || "Gift"}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isClaimed ? "bg-green-500/20 text-green-500" :
                            canClaim ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {isClaimed ? "Claimed" : canClaim ? "Ready" : status.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">From: {gift.sender_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-semibold text-foreground">₦{gift.amount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(gift.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {gift.personal_message && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground italic">"{gift.personal_message}"</p>
                      </div>
                    )}
                    {canClaim && (
                      <div className="mt-3">
                        <Button
                          onClick={() => handleClaimGift(gift.id)}
                          disabled={isLoading}
                          className="w-full bg-green-500 hover:bg-green-600"
                        >
                          {isLoading ? "Claiming..." : "Claim Gift"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>


      {/* Fixed Bottom Send Button */}
      {activeTab === "send" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSendGift}
              disabled={!isFormValid || isProcessing || insufficientBalance}
              className={`w-full h-14 rounded-xl font-bold text-lg transition-all ${
                isFormValid && !insufficientBalance
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <IonIcon name="gift" size="22px" />
                  Send Gift Card
                  {numAmount > 0 && <span className="opacity-80">• ₦{numAmount.toLocaleString()}</span>}
                </div>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}