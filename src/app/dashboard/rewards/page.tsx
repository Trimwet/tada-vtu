"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getSupabase } from "@/lib/supabase/client";
import { OCCASION_CONFIG, getExpiryCountdown } from "@/lib/gift-cards";
import type { GiftCard } from "@/types/database";

export default function RewardsPage() {
  const { user } = useSupabaseUser();
  const [receivedGifts, setReceivedGifts] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchReceivedGifts();
    }
  }, [user?.id]);

  const fetchReceivedGifts = async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabase();
    
    const userEmail = user.email || "";
    const { data } = await supabase
      .from("gift_cards")
      .select("*")
      .or(`recipient_user_id.eq.${user.id},recipient_email.eq.${userEmail}`)
      .order("created_at", { ascending: false })
      .limit(20);

    setReceivedGifts((data as GiftCard[]) || []);
    setLoading(false);
  };

  const pendingGifts = receivedGifts.filter(g => g.status === "delivered");
  const claimedGifts = receivedGifts.filter(g => g.status === "credited" || g.status === "opened");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Rewards</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-gradient-to-br from-pink-500/10 to-rose-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-pink-500">{pendingGifts.length}</p>
              <p className="text-xs text-muted-foreground">Pending Gifts</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-500">{claimedGifts.length}</p>
              <p className="text-xs text-muted-foreground">Claimed Gifts</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Gifts */}
        {pendingGifts.length > 0 && (
          <Card className="border-pink-500/50 bg-gradient-to-br from-pink-500/5 to-rose-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <IonIcon name="gift" size="20px" color="#ec4899" />
                Pending Gifts ({pendingGifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingGifts.map((gift) => {
                const occasionConfig = OCCASION_CONFIG[gift.occasion];
                const expiry = getExpiryCountdown(gift.expires_at);
                return (
                  <Link
                    key={gift.id}
                    href={`/gift/${gift.id}`}
                    className="block p-4 rounded-xl border border-border bg-background hover:border-pink-500/50 transition-smooth"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: `${occasionConfig?.color || "#ec4899"}20` }}
                      >
                        <IonIcon
                          name={occasionConfig?.icon || "gift"}
                          size="24px"
                          color={occasionConfig?.color || "#ec4899"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">From: {gift.sender_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ₦{gift.amount.toLocaleString()} airtime
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-pink-500 flex items-center gap-1">
                          <IonIcon name="gift" size="14px" />
                          Claim
                        </span>
                        {!expiry.expired && (
                          <p className="text-xs text-amber-500 mt-1">{expiry.message}</p>
                        )}
                      </div>
                    </div>
                    {gift.personal_message && (
                      <p className="text-sm text-muted-foreground mt-2 italic truncate">
                        &ldquo;{gift.personal_message}&rdquo;
                      </p>
                    )}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* No Pending Gifts */}
        {pendingGifts.length === 0 && (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IonIcon name="gift-outline" size="32px" color="#ec4899" />
              </div>
              <p className="font-medium text-foreground">No pending gifts</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone sends you a gift, it will appear here
              </p>
              <Button asChild className="mt-4 bg-pink-500 hover:bg-pink-600">
                <Link href="/dashboard/send-gift">Send a Gift</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Claimed Gifts History */}
        {claimedGifts.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <IonIcon name="checkmark-circle" size="20px" color="#22c55e" />
                Claimed Gifts ({claimedGifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {claimedGifts.map((gift) => {
                const occasionConfig = OCCASION_CONFIG[gift.occasion];
                return (
                  <div
                    key={gift.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${occasionConfig?.color || "#22c55e"}20` }}
                    >
                      <IonIcon
                        name={occasionConfig?.icon || "gift"}
                        size="20px"
                        color={occasionConfig?.color || "#22c55e"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">From: {gift.sender_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(gift.opened_at || gift.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500">₦{gift.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Claimed</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
