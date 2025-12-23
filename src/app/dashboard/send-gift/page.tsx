"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getSupabase } from "@/lib/supabase/client";
import { OCCASION_CONFIG, GIFT_AMOUNTS, getThemesByOccasion, getGiftStatusDisplay } from "@/lib/gift-cards";
import type { GiftCard, GiftOccasion } from "@/types/database";

export default function SendGiftPage() {
  const { user, refreshUser } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<"send" | "sent" | "received">("send");
  const [sentGifts, setSentGifts] = useState<GiftCard[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const occasions = Object.entries(OCCASION_CONFIG) as [GiftOccasion, { label: string; icon: string; color: string }][];
  const themes = selectedOccasion ? getThemesByOccasion(selectedOccasion) : [];

  const fetchGifts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();
    const { data: sent } = await supabase.from("gift_cards").select("*").eq("sender_id", user.id).order("created_at", { ascending: false }).limit(20);
    const { data: receivedById } = await supabase.from("gift_cards").select("*").eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(20);
    let receivedByEmail: GiftCard[] = [];
    if (user.email) {
      const { data } = await supabase.from("gift_cards").select("*").eq("recipient_email", user.email).is("recipient_user_id", null).order("created_at", { ascending: false }).limit(20);
      receivedByEmail = (data as GiftCard[]) || [];
    }
    const allReceived = [...((receivedById as GiftCard[]) || []), ...receivedByEmail];
    setSentGifts((sent as GiftCard[]) || []);
    setReceivedGifts(allReceived.filter((g, i, s) => i === s.findIndex((x) => x.id === g.id)).slice(0, 20));
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchGifts(); }, [user, fetchGifts]);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOccasion || !selectedThemeId || !amount || !recipientEmail || !recipientPhone) {
      toast.warning("Please fill all fields");
      return;
    }
    const numAmount = parseInt(amount);
    if (numAmount < 100) { toast.warning("Minimum is N100"); return; }
    if (!user || (user.balance || 0) < numAmount) { toast.error("Insufficient balance"); return; }
    setIsProcessing(true);
    try {
      const supabase = getSupabase();
      // @ts-expect-error Supabase types
      await supabase.from("gift_cards").insert({ sender_id: user.id, sender_name: user.full_name || "Anonymous", recipient_email: recipientEmail, recipient_phone: recipientPhone, service_type: "airtime", amount: numAmount, occasion: selectedOccasion, theme_id: selectedThemeId, personal_message: personalMessage || null, status: "pending" });
      // @ts-expect-error Supabase types
      await supabase.from("profiles").update({ balance: (user.balance || 0) - numAmount }).eq("id", user.id);
      await refreshUser();
      await fetchGifts();
      toast.payment("Gift sent!", "N" + numAmount.toLocaleString() + " sent");
      setSelectedOccasion(null); setSelectedThemeId(""); setAmount(""); setRecipientPhone(""); setRecipientEmail(""); setPersonalMessage("");
    } catch (err) { console.error(err); toast.error("Failed to send"); } finally { setIsProcessing(false); }
  };

  const handleClaimGift = async (giftId: string) => {
    if (!user) return;
    setActionLoading(giftId);
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from("gift_cards").select("*").eq("id", giftId).single();
      const gift = data as GiftCard | null;
      if (!gift || gift.status !== "pending") { toast.warning("Cannot claim"); setActionLoading(null); return; }
      // @ts-expect-error Supabase types
      await supabase.from("gift_cards").update({ status: "credited", recipient_user_id: user.id }).eq("id", giftId);
      // @ts-expect-error Supabase types
      await supabase.from("profiles").update({ balance: (user.balance || 0) + gift.amount }).eq("id", user.id);
      await refreshUser();
      await fetchGifts();
      toast.payment("Claimed!", "N" + gift.amount.toLocaleString() + " added");
    } catch (err) { console.error(err); toast.error("Failed"); } finally { setActionLoading(null); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold ml-2 lg:ml-0">Gift Cards</h1>
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
                  <CardDescription>Send airtime as a gift</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-green-500">N{(user?.balance || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl mb-6">
              {(["send", "sent", "received"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setActiveTab(t)} className={`py-2.5 rounded-lg font-medium text-sm ${activeTab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                  {t === "send" ? "Send" : t === "sent" ? "Sent" : "Received"}
                </button>
              ))}
            </div>

            {activeTab === "send" && (
              <form onSubmit={handleSendGift} className="space-y-6">
                <div className="space-y-3">
                  <Label>Select Occasion</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {occasions.map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => { setSelectedOccasion(key); setSelectedThemeId(""); }}
                        className={`p-3 rounded-xl border-2 ${selectedOccasion === key ? "border-pink-500 bg-pink-500/10" : "border-border hover:border-pink-500/50"}`}>
                        <IonIcon name={cfg.icon} size="20px" color={cfg.color} />
                        <div className="text-xs mt-1">{cfg.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedOccasion && themes.length > 0 && (
                  <div className="space-y-3">
                    <Label>Select Theme</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {themes.map((theme) => (
                        <button key={theme.id} type="button" onClick={() => setSelectedThemeId(theme.id)}
                          className={`p-3 rounded-xl border-2 text-left ${selectedThemeId === theme.id ? "border-pink-500 bg-pink-500/10" : "border-border"}`}>
                          <div className="font-medium text-sm">{theme.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Recipient Phone</Label>
                  <Input type="tel" placeholder="08012345678" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input type="email" placeholder="email@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} required />
                </div>
                <div className="space-y-3">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} min="100" required />
                  <div className="flex flex-wrap gap-2">
                    {GIFT_AMOUNTS.map((a) => (
                      <button key={a.value} type="button" onClick={() => setAmount(a.value.toString())}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${amount === a.value.toString() ? "border-pink-500 bg-pink-500/10 text-pink-500" : "border-border"}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message (Optional)</Label>
                  <textarea placeholder="Add a message..." value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none" rows={2} maxLength={200} />
                </div>
                <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white h-12" disabled={isProcessing}>
                  {isProcessing ? "Sending..." : "Send Gift Card"}
                </Button>
              </form>
            )}

            {activeTab === "sent" && (
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8"><div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : sentGifts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No gifts sent yet</p>
                ) : (
                  sentGifts.map((g) => {
                    const st = getGiftStatusDisplay(g.status);
                    return (
                      <div key={g.id} className="p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{g.recipient_email}</p>
                            <p className="text-xs text-muted-foreground">{OCCASION_CONFIG[g.occasion]?.label} - {formatDate(g.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">N{g.amount.toLocaleString()}</p>
                            <span className={`text-xs ${st.color}`}>{st.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "received" && (
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : receivedGifts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No gifts received yet</p>
                ) : (
                  receivedGifts.map((g) => {
                    const st = getGiftStatusDisplay(g.status);
                    return (
                      <div key={g.id} className="p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">From {g.sender_name}</p>
                            <p className="text-xs text-muted-foreground">{OCCASION_CONFIG[g.occasion]?.label} - {formatDate(g.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-500">N{g.amount.toLocaleString()}</p>
                            <span className={`text-xs ${st.color}`}>{st.label}</span>
                          </div>
                        </div>
                        {g.status === "pending" && (
                          <Button onClick={() => handleClaimGift(g.id)} className="w-full mt-3 bg-green-500 hover:bg-green-600" disabled={actionLoading === g.id}>
                            {actionLoading === g.id ? "Claiming..." : "Claim Gift"}
                          </Button>
                        )}
                      </div>
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
