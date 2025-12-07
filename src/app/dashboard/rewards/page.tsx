"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export default function RewardsPage() {
  const { user } = useSupabaseUser();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoinBeta = async () => {
    if (!user?.email) {
      toast.error("Please log in to join the waitlist");
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (data.success) {
        setHasJoined(true);
        toast.success("You're on the list!", {
          description: "We'll notify you when Watch & Earn launches.",
        });
      } else {
        toast.error(data.message || "Failed to join waitlist");
      }
    } catch (error) {
      console.error("Waitlist join error:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
              Rewards
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Hero Card */}
        <Card className="border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <IonIcon name="gift" size="28px" color="#22c55e" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Watch & Earn</h2>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Earn free airtime and data by watching short ads. Join the waitlist to get early access.
            </p>

            {hasJoined ? (
              <Button disabled className="w-full bg-green-500/20 text-green-500">
                <IonIcon name="checkmark-circle" size="18px" className="mr-2" />
                You&apos;re on the Waitlist
              </Button>
            ) : (
              <Button
                onClick={handleJoinBeta}
                disabled={isJoining}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <IonIcon name="notifications" size="18px" className="mr-2" />
                    Join Waitlist
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="information-circle-outline" size="20px" color="#22c55e" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-500 font-semibold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Watch Short Ads</p>
                <p className="text-sm text-muted-foreground">15-30 second clips from top brands</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-500 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Earn Points</p>
                <p className="text-sm text-muted-foreground">Up to 50 points per video watched</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-500 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Redeem Rewards</p>
                <p className="text-sm text-muted-foreground">Convert points to airtime or data instantly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Earnings */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="calculator-outline" size="20px" color="#22c55e" />
              Potential Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-xs text-muted-foreground">Videos/Day</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-green-500">₦150</p>
                <p className="text-xs text-muted-foreground">Daily</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-green-500">₦4,500</p>
                <p className="text-xs text-muted-foreground">Monthly</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              *Based on watching 5 ads daily at 30 points each
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="help-circle-outline" size="20px" color="#22c55e" />
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-foreground text-sm">When does it launch?</p>
              <p className="text-sm text-muted-foreground">Q1 2025. Early access users will be notified first.</p>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">How many ads can I watch?</p>
              <p className="text-sm text-muted-foreground">Up to 10 ads daily, with bonus opportunities on weekends.</p>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">What&apos;s the minimum withdrawal?</p>
              <p className="text-sm text-muted-foreground">500 points (₦50). Instant redemption, no waiting.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
