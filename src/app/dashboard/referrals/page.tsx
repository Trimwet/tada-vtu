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
import {
  ArrowLeft,
  Copy,
  Share2,
  Users,
  DollarSign,
  Gift,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getSupabase } from "@/lib/supabase/client";

interface Referral {
  id: string;
  full_name: string | null;
  created_at: string;
  balance: number;
  hasDeposited?: boolean;
}

export default function ReferralsPage() {
  const { user } = useSupabaseUser();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch referrals from database with deposit status
  useEffect(() => {
    if (!user?.id) return;

    const fetchReferrals = async () => {
      setLoading(true);
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, balance')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Check each referral for deposit status
        const referralData = data as Array<{ id: string; full_name: string | null; created_at: string; balance: number }>;
        const referralsWithStatus = await Promise.all(
          referralData.map(async (referral) => {
            const { count } = await supabase
              .from('transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', referral.id)
              .eq('type', 'deposit')
              .eq('status', 'success');
            
            return { ...referral, hasDeposited: (count || 0) > 0 };
          })
        );
        setReferrals(referralsWithStatus);
      }
      setLoading(false);
    };

    fetchReferrals();
  }, [user?.id]);

  const referralCode = user?.referral_code || 'LOADING...';
  const referralLink = `https://tadavtu.com/register?ref=${referralCode}`;
  
  // Calculate stats - only count those who made deposits
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.hasDeposited).length;
  const pendingReferrals = totalReferrals - activeReferrals;
  const totalEarnings = activeReferrals * 100; // ₦100 per active referral
  const pendingEarnings = pendingReferrals * 100;

  const handleWhatsAppShare = () => {
    const message = `🎉 Join TADA VTU and get instant airtime & data at the best prices!\n\nUse my referral code: ${referralCode}\n\nSign up here: ${referralLink}\n\nWe both get ₦100 bonus when you make your first deposit! 💰`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join TADA VTU",
          text: `Use my referral code ${referralCode} to get started with TADA VTU!`,
          url: referralLink,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 lg:hidden"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Referral Program
          </h1>
          <p className="text-muted-foreground">
            Invite friends and earn ₦100 for each successful referral!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-600 to-emerald-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 mb-1">Total Referrals</p>
                  <p className="text-4xl font-bold">{totalReferrals}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 mb-1">Total Earnings</p>
                  <p className="text-4xl font-bold">₦{totalEarnings}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 mb-1">Pending</p>
                  <p className="text-4xl font-bold">₦{pendingEarnings}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Gift className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends to earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-card rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    Referral Code
                  </p>
                  <p className="font-mono font-bold text-lg text-card-foreground">
                    {referralCode}
                  </p>
                </div>
                <Button
                  onClick={handleCopy}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-card rounded-lg border border-border overflow-hidden">
                  <p className="text-sm text-card-foreground truncate">
                    {referralLink}
                  </p>
                </div>
                <Button
                  onClick={handleShare}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleWhatsAppShare}
                className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">1</span>
                </div>
                <h3 className="font-semibold text-card-foreground mb-2">
                  Share Your Link
                </h3>
                <p className="text-sm text-muted-foreground">
                  Share your unique referral link with friends and family
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold text-card-foreground mb-2">
                  They Sign Up
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your friend creates an account using your referral code
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-card-foreground mb-2">
                  Earn Rewards
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get ₦100 when they make their first deposit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Referral History
            </CardTitle>
            <CardDescription>Track your referrals and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No referrals yet. Start sharing your link!
                  </p>
                </div>
              ) : (
                referrals.map((referral) => {
                  const hasDeposited = referral.hasDeposited === true;
                  const displayName = referral.full_name || 'Anonymous User';
                  const joinDate = new Date(referral.created_at).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  
                  return (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasDeposited ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                          <span className={`font-semibold ${hasDeposited ? 'text-green-600' : 'text-yellow-600'}`}>
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground">
                            {displayName.split(' ')[0]}{displayName.split(' ')[1] ? ` ${displayName.split(' ')[1].charAt(0)}.` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {joinDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            hasDeposited
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {hasDeposited ? "+₦100 ✓" : "Awaiting deposit"}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                            hasDeposited
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {hasDeposited ? "Earned" : "Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
