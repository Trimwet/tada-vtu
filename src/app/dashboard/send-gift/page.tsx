"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { OCCASION_CONFIG, GIFT_AMOUNTS, getThemesByOccasion, getGiftStatusDisplay } from "@/lib/gift-cards";
import type { GiftCard, GiftOccasion } from "@/types/database";

export default function SendGiftPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"send" | "sent" | "received">("send");
  const [sentGifts, setSentGifts] = useState<GiftCard[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [step, setStep] = useState(1);
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const occasions = Object.entries(OCCASION_CONFIG) as [GiftOccasion, { label: string; icon: string; color: string }][];

  useEffect(() => {
    if (user) fetchGifts();
  }, [user]);

  const fetchGifts = async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();

    const { data: sent } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch received gifts - query by user ID or email
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
    
    // Merge and dedupe
    const allReceived: GiftCard[] = [...((receivedById as GiftCard[]) || []), ...receivedByEmail];
    const received = allReceived.filter((gift, index, self) => 
      index === self.findIndex(g => g.id === gift.id)
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

    setSentGifts((sent as GiftCard[]) || []);
    setReceivedGifts((received as GiftCard[]) || []);
    setLoading(false);
  };

  const handleOccasionSelect = (occ: GiftOccasion) => {
    setSelectedOccasion(occ);
    const themes = getThemesByOccasion(occ);
    if (themes.length > 0) setSelectedThemeId(themes[0].id);
    setStep(2);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
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

    // Validate
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
        toast.payment("Gift sent successfully!", `₦${parseInt(amount).toLocaleString()} gift card created`);
        
        // Reset form
        setStep(1);
        setSelectedOccasion(null);
        setAmount("");
        setRecipientEmail("");
        setRecipientPhone("");
        setPersonalMessage("");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 hover:bg-muted active:bg-muted/80 rounded-lg transition-smooth lg:hidden touch-target"
          >
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
            Gift Cards
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center">
                  <IonIcon name="gift" size="24px" color="#ec4899" />
                </div>
                <div>
                  <CardTitle className="text-xl">Send Gift Card</CardTitle>
                  <CardDescription>Send airtime with love</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-green-500">
                  ₦{(profile?.balance || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Tab Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl mb-6">
              {(["send", "sent", "received"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "send" && <IonIcon name="gift-outline" size="18px" className={activeTab === tab ? "text-pink-500" : ""} />}
                  {tab === "sent" && <IonIcon name="paper-plane-outline" size="18px" className={activeTab === tab ? "text-blue-500" : ""} />}
                  {tab === "received" && <IonIcon name="download-outline" size="18px" className={activeTab === tab ? "text-green-500" : ""} />}
                  <span className="capitalize">{tab}</span>
                  {tab === "sent" && sentGifts.length > 0 && (
                    <span className="text-xs bg-muted-foreground/20 px-1.5 rounded">{sentGifts.length}</span>
                  )}
                  {tab === "received" && receivedGifts.length > 0 && (
                    <span className="text-xs bg-muted-foreground/20 px-1.5 rounded">{receivedGifts.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* SEND TAB */}
            {activeTab === "send" && (
              <form onSubmit={handleSendGift} className="space-y-6">
                {/* Step 1: Select Occasion */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground mb-1">What&apos;s the occasion?</h3>
                      <p className="text-sm text-muted-foreground">Choose the perfect theme for your gift</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {occasions.map(([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleOccasionSelect(key)}
                          className="group p-4 rounded-xl border-2 border-border hover:border-pink-500/50 hover:bg-pink-500/5 transition-all text-left active:scale-95"
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            <IonIcon name={config.icon} size="26px" color={config.color} />
                          </div>
                          <p className="font-semibold text-foreground group-hover:text-pink-500 transition-colors">
                            {config.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Select Amount */}
                {step === 2 && (
                  <div className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      <IonIcon name="arrow-back" size="16px" />
                      Back
                    </button>

                    <div className="text-center py-3">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
                        style={{ backgroundColor: `${selectedOccasion ? OCCASION_CONFIG[selectedOccasion].color : "#ec4899"}20` }}
                      >
                        <IonIcon
                          name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"}
                          size="36px"
                          color={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].color : "#ec4899"}
                        />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label} Gift
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose an amount to send
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">Quick Select</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {GIFT_AMOUNTS.map((amt) => {
                          const isDisabled = amt.value > (profile?.balance || 0);
                          const isSelected = amount === amt.value.toString();
                          return (
                            <button
                              key={amt.value}
                              type="button"
                              onClick={() => handleQuickAmount(amt.value)}
                              disabled={isDisabled}
                              className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                                isSelected
                                  ? "border-pink-500 bg-pink-500/10 shadow-md"
                                  : isDisabled
                                  ? "border-border/50 bg-muted/30 opacity-40 cursor-not-allowed"
                                  : "border-border hover:border-pink-500/50 hover:bg-pink-500/5 active:scale-95"
                              }`}
                            >
                              <p className={`text-base font-bold ${isSelected ? "text-pink-500" : "text-foreground"}`}>
                                {amt.label}
                              </p>
                              {isDisabled && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Low balance</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-card px-2 text-muted-foreground">or enter custom amount</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">Custom Amount</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold text-lg">₦</span>
                        <Input
                          type="number"
                          placeholder="100"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-10 pr-4 h-14 bg-background border-2 border-border focus:border-pink-500 text-lg font-bold text-foreground placeholder:text-muted-foreground/40"
                          min="100"
                          max="50000"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Min: ₦100 • Max: ₦50,000</span>
                        <span className="text-green-500 font-medium">
                          Balance: ₦{(profile?.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={validateAndProceed}
                      className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold h-12 shadow-lg shadow-pink-500/20 transition-all active:scale-95"
                      disabled={!amount || parseInt(amount) < 100}
                    >
                      {!amount || parseInt(amount) < 100 ? (
                        "Enter amount to continue"
                      ) : (
                        <span className="flex items-center gap-2">
                          Continue with ₦{parseInt(amount).toLocaleString()}
                          <IonIcon name="arrow-forward" size="18px" />
                        </span>
                      )}
                    </Button>
                  </div>
                )}


                {/* Step 3: Recipient Details */}
                {step === 3 && (
                  <div className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      <IonIcon name="arrow-back" size="16px" />
                      Back
                    </button>

                    <div className="text-center py-3 bg-gradient-to-br from-pink-500/10 to-pink-600/5 rounded-2xl border border-pink-500/20">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <IonIcon 
                          name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"} 
                          size="20px" 
                          color="#ec4899" 
                        />
                        <p className="text-3xl font-bold text-foreground">₦{parseInt(amount).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label} Gift Card
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <IonIcon name="mail" size="14px" className="text-pink-500" />
                          Recipient&apos;s Email
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <IonIcon
                            name="mail-outline"
                            size="18px"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          />
                          <Input
                            id="email"
                            type="email"
                            placeholder="friend@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            className="pl-10 h-12 bg-background border-2 border-border focus:border-pink-500 text-foreground"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IonIcon name="information-circle" size="12px" />
                          They&apos;ll receive a notification to claim the gift
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <IonIcon name="call" size="14px" className="text-pink-500" />
                          Phone Number
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <IonIcon
                            name="call-outline"
                            size="18px"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="08012345678"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="pl-10 h-12 bg-background border-2 border-border focus:border-pink-500 text-foreground"
                            maxLength={11}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IonIcon name="information-circle" size="12px" />
                          Airtime will be delivered to this number
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <IonIcon name="chatbubble-ellipses" size="14px" className="text-pink-500" />
                          Personal Message
                          <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                        </Label>
                        <textarea
                          id="message"
                          placeholder="Write a heartfelt message... 💝"
                          value={personalMessage}
                          onChange={(e) => setPersonalMessage(e.target.value)}
                          className="w-full h-24 px-3 py-3 rounded-xl border-2 border-border focus:border-pink-500 bg-background text-foreground resize-none focus:outline-none text-sm transition-colors"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Make it special with your words</span>
                          <span className="text-muted-foreground">{personalMessage.length}/500</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <IonIcon name="receipt" size="18px" color="#ec4899" />
                        Summary
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Occasion</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <IonIcon 
                              name={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].icon : "gift"} 
                              size="14px" 
                              color={selectedOccasion ? OCCASION_CONFIG[selectedOccasion].color : "#ec4899"}
                            />
                            {selectedOccasion && OCCASION_CONFIG[selectedOccasion].label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">To</span>
                          <span className="font-semibold text-foreground truncate max-w-[180px]">
                            {recipientEmail || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-semibold text-foreground">{recipientPhone || "—"}</span>
                        </div>
                        <div className="border-t border-border pt-2.5 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-foreground">Total Amount</span>
                            <span className="font-bold text-pink-500 text-xl">
                              ₦{parseInt(amount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold h-14 shadow-lg shadow-pink-500/20 transition-all active:scale-95"
                      disabled={!recipientEmail || !recipientPhone || isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending Gift...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <IonIcon name="gift" size="22px" />
                          Send Gift Card Now
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            )}


            {/* SENT TAB */}
            {activeTab === "sent" && (
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Loading your gifts...</p>
                  </div>
                ) : sentGifts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <IonIcon name="gift-outline" size="40px" color="#ec4899" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-2">No gifts sent yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                      Spread joy by sending your first gift to someone special!
                    </p>
                    <Button
                      onClick={() => setActiveTab("send")}
                      className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-pink-500/20"
                    >
                      <IonIcon name="gift" size="18px" className="mr-2" />
                      Send Your First Gift
                    </Button>
                  </div>
                ) : (
                  sentGifts.map((gift) => {
                    const status = getGiftStatusDisplay(gift.status);
                    const occasionConfig = OCCASION_CONFIG[gift.occasion];
                    return (
                      <div
                        key={gift.id}
                        className="p-4 rounded-xl border-2 border-border hover:border-pink-500/50 hover:shadow-md transition-all bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                            style={{ backgroundColor: `${occasionConfig?.color || "#ec4899"}20` }}
                          >
                            <IonIcon
                              name={occasionConfig?.icon || "gift"}
                              size="26px"
                              color={occasionConfig?.color || "#ec4899"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm mb-0.5">
                                  {occasionConfig?.label || "Gift"}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  To: {gift.recipient_email}
                                </p>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color} whitespace-nowrap`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <IonIcon name="cash" size="12px" />
                                ₦{gift.amount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <IonIcon name="calendar" size="12px" />
                                {formatDate(gift.created_at)}
                              </span>
                            </div>
                            {gift.personal_message && (
                              <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2 bg-muted/30 p-2 rounded-lg">
                                &ldquo;{gift.personal_message}&rdquo;
                              </p>
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
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Loading your gifts...</p>
                  </div>
                ) : receivedGifts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <IonIcon name="gift-outline" size="40px" color="#22c55e" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-2">No gifts yet</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                      Share your email with friends and family to receive gifts!
                    </p>
                    <div className="bg-muted/50 p-4 rounded-xl max-w-sm mx-auto">
                      <p className="text-xs text-muted-foreground mb-2">Your email:</p>
                      <p className="font-semibold text-foreground text-sm">{user?.email || "Not set"}</p>
                    </div>
                  </div>
                ) : (
                  receivedGifts.map((gift) => {
                    const status = getGiftStatusDisplay(gift.status);
                    const occasionConfig = OCCASION_CONFIG[gift.occasion];
                    const canOpen = gift.status === "delivered";
                    return (
                      <Link
                        key={gift.id}
                        href={`/gift/${gift.id}`}
                        className="block p-4 rounded-xl border-2 border-border hover:border-green-500/50 hover:shadow-md transition-all bg-card group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: `${occasionConfig?.color || "#22c55e"}20` }}
                          >
                            <IonIcon
                              name={occasionConfig?.icon || "gift"}
                              size="26px"
                              color={occasionConfig?.color || "#22c55e"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm mb-0.5">
                                  {occasionConfig?.label || "Gift"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  From: {gift.sender_name}
                                </p>
                              </div>
                              {canOpen ? (
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-500 text-white flex items-center gap-1 animate-pulse">
                                  <IonIcon name="gift" size="14px" />
                                  Open
                                </span>
                              ) : (
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>
                                  {status.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 font-semibold text-green-500">
                                <IonIcon name="cash" size="12px" />
                                ₦{gift.amount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <IonIcon name="calendar" size="12px" />
                                {formatDate(gift.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
