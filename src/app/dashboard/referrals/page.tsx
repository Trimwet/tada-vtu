"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { toast } from "sonner";

export default function ReferralsPage() {
  const { user } = useSupabaseUser();
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (user?.referral_code) {
      setReferralLink(`https://tadavtu.com/register?ref=${user.referral_code}`);
    }
  }, [user?.referral_code]);

  const copyToClipboard = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareReferral = async () => {
    const text = `Join TADA VTU and get free data! Use my referral link: ${referralLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join TADA VTU",
          text: text,
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 lg:hidden gap-2"
        >
          <IonIcon name="arrow-back" size="16px" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Referral Program
          </h1>
          <p className="text-muted-foreground">
            Invite friends and earn points for free airtime & data
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Points Card */}
          <Card className="border-border bg-gradient-to-br from-amber-500/10 to-orange-500/10">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <IonIcon name="gift-outline" size="24px" className="text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-500">
                {((user as any)?.referral_points) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Your Points</p>
            </CardContent>
          </Card>

          {/* Referrals Card */}
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <IonIcon name="people-outline" size="24px" className="text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-500">
                {((user as any)?.referral_count) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IonIcon name="help-circle-outline" size="20px" className="text-green-500" />
              How it Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-500">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Share your referral link</p>
                  <p className="text-sm text-muted-foreground">Send your unique link to friends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-500">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Friend signs up & makes first deposit</p>
                  <p className="text-sm text-muted-foreground">They need to fund their wallet once</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-500">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Earn 100 points</p>
                  <p className="text-sm text-muted-foreground">Get points instantly when they deposit</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-500">4</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Redeem for free airtime or data</p>
                  <p className="text-sm text-muted-foreground">Use points to buy airtime & data</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Card */}
        <Card className="border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IonIcon name="share-outline" size="20px" className="text-green-500" />
              Invite Friends
            </CardTitle>
            <CardDescription>
              Share your referral link and earn points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Referral Code Display */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
              <p className="text-xl font-mono font-bold text-foreground">
                {user?.referral_code || "Loading..."}
              </p>
            </div>

            {/* Referral Link */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Referral Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-muted/50 border border-input rounded-lg px-3 py-2 text-sm font-mono truncate"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <IonIcon 
                    name={copied ? "checkmark-outline" : "copy-outline"} 
                    size="16px" 
                    className={copied ? "text-green-500" : ""}
                  />
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={shareReferral}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                <IonIcon name="share-social-outline" size="18px" className="mr-2" />
                Share Link
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1"
              >
                <IonIcon name="copy-outline" size="18px" className="mr-2" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Redeem Points Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IonIcon name="card-outline" size="20px" className="text-amber-500" />
              Redeem Points
            </CardTitle>
            <CardDescription>
              Use your points to get free airtime or data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Link href="/dashboard/buy-airtime" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex-col gap-1">
                  <IonIcon name="call-outline" size="20px" />
                  <span className="text-xs">Buy Airtime</span>
                </Button>
              </Link>
              <Link href="/dashboard/buy-data" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex-col gap-1">
                  <IonIcon name="wifi-outline" size="20px" />
                  <span className="text-xs">Buy Data</span>
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Points will be applied automatically at checkout when you have enough points
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
