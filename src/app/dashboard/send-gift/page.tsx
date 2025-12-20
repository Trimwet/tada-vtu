"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { GiftLivePreview } from "@/components/gift-live-preview";
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
        toast.success("Gift cancelled");
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
        toast.success("Gift claimed!");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-16 px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-xl transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="22px" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <IonIcon name="gift" size="22px" color="white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Gift Cards</h1>
                <p className="text-xs text-muted-foreground">Send airtime gifts</p>
              </div>
            </div>
          </div>
          <div className="text-right bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className="font-bold text-green-500">₦{(profile?.balance || 0).toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
          {(["send", "sent", "received"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const counts = { send: 0, sent: sentGifts.length, received: receivedGifts.length };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-smooth capitalize ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {counts[tab] > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded-full">
                    {counts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* SEND TAB */}
        {activeTab === "send" && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IonIcon name="gift" size="20px" className="text-green-500" />
                  Send Gift Card
                </CardTitle>
                <CardDescription>
                  Send airtime as a gift to friends and family
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendGift} className="space-y-4">
                  {/* Occasion */}
                  <div className="space-y-2">
                    <Label>Occasion</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {occasions.slice(0, 6).map(([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedOccasion(key);
                            const themes = getThemesByOccasion(key);
                            if (themes.length > 0) setSelectedThemeId(themes[0].id);
                          }}
                          className={`p-3 rounded-lg border text-left transition-smooth ${
                            selectedOccasion === key
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-border hover:border-green-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <IonIcon name={config.icon} size="16px" color={config.color} />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {GIFT_AMOUNTS.map((amt) => (
                        <button
                          key={amt.value}
                          type="button"
                          onClick={() => setAmount(amt.value.toString())}
                          disabled={amt.value > (profile?.balance || 0)}
                          className={`p-2 rounded-lg border text-sm font-medium transition-smooth ${
                            amount === amt.value.toString()
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-border hover:border-green-200 disabled:opacity-50"
                          }`}
                        >
                          {amt.label}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="100"
                      max="50000"
                    />
                  </div>

                  {/* Recipient Email */}
                  <div className="space-y-2">
                    <Label>Recipient Email</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={recipientEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={
                          recipientLookup?.checked
                            ? recipientLookup.found
                              ? "border-green-500"
                              : "border-yellow-500"
                            : ""
                        }
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {lookupLoading ? (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
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
                      <p className={`text-sm ${recipientLookup.found ? "text-green-600" : "text-yellow-600"}`}>
                        {recipientLookup.found 
                          ? `✓ ${recipientLookup.name} (TADA user)`
                          : "⚠ Not a TADA user (they'll receive an invite)"
                        }
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="08012345678"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      maxLength={11}
                      required
                    />
                  </div>

                  {/* Personal Message with AI Generator */}
                  <div className="space-y-2">
                    <Label>Personal Message (Optional)</Label>
                    
                    {/* AI Message Generator */}
                    {selectedOccasion && amount && (
                      <AiMessageGenerator
                        senderName={profile?.full_name || "Someone special"}
                        recipientName={recipientLookup?.name}
                        occasion={selectedOccasion}
                        amount={parseInt(amount) || 0}
                        onGenerate={(message) => setPersonalMessage(message)}
                        disabled={!selectedOccasion || !amount}
                      />
                    )}
                    
                    <textarea
                      placeholder="Write something special..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      className="w-full h-24 px-3 py-2 rounded-lg border border-border focus:border-green-500 focus:outline-none resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{personalMessage.length}/500</p>
                  </div>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={!selectedOccasion || !amount || !recipientEmail || !recipientPhone || isProcessing}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Gift...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IonIcon name="gift" size="20px" />
                        Send Gift Card
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <div className="space-y-4">
              <GiftLivePreview
                occasion={selectedOccasion}
                amount={amount}
                senderName={profile?.full_name || "Someone special"}
                recipientEmail={recipientEmail}
                personalMessage={personalMessage}
              />
            </div>
          </div>
        )}

        {/* SENT TAB */}
        {activeTab === "sent" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Loading sent gifts...</p>
              </div>
            ) : sentGifts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <IonIcon name="gift-outline" size="48px" className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No gifts sent yet</h3>
                  <p className="text-muted-foreground mb-4">Start spreading joy by sending your first gift!</p>
                  <Button onClick={() => setActiveTab("send")} className="bg-green-500 hover:bg-green-600">
                    Send Your First Gift
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sentGifts.map((gift) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canCancel = gift.status === "scheduled" || gift.status === "delivered";
                const isLoading = actionLoading === gift.id;

                return (
                  <Card key={gift.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <IonIcon name={config?.icon || "gift"} size="24px" className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{config?.label || "Gift"}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">To: {gift.recipient_email}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="font-semibold">₦{gift.amount.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">{formatDate(gift.created_at)}</span>
                          </div>
                        </div>
                        {canCancel && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelGift(gift.id)}
                            disabled={isLoading}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {isLoading ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* RECEIVED TAB */}
        {activeTab === "received" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Loading received gifts...</p>
              </div>
            ) : receivedGifts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <IonIcon name="gift-outline" size="48px" className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No gifts received yet</h3>
                  <p className="text-muted-foreground">When someone sends you a gift, it will appear here!</p>
                </CardContent>
              </Card>
            ) : (
              receivedGifts.map((gift) => {
                const status = getGiftStatusDisplay(gift.status);
                const config = OCCASION_CONFIG[gift.occasion];
                const canClaim = gift.status === "delivered" && !gift.opened_at;
                const isClaimed = gift.status === "credited";
                const isLoading = actionLoading === gift.id;

                return (
                  <Card key={gift.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <IonIcon name={config?.icon || "gift"} size="24px" className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{config?.label || "Gift"}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isClaimed ? "bg-green-100 text-green-700" : 
                              canClaim ? "bg-yellow-100 text-yellow-700" : status.color
                            }`}>
                              {isClaimed ? "Claimed" : canClaim ? "Ready to Claim" : status.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">From: {gift.sender_name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="font-semibold">₦{gift.amount.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">{formatDate(gift.created_at)}</span>
                          </div>
                        </div>
                        {canClaim && (
                          <Button
                            onClick={() => handleClaimGift(gift.id)}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            {isLoading ? "Claiming..." : "Claim Gift"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}