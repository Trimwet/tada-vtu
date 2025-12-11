"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getSupabase } from "@/lib/supabase/client";

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  availableBalance: number;
}

interface Referral {
  id: string;
  full_name: string;
  created_at: string;
  has_deposited: boolean;
}

export default function RewardsPage() {
  const { user } = useSupabaseUser();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalEarnings: 0,
    availableBalance: 0,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("MTN");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referral_code || "";
  const referralLink = typeof window !== "undefined" 
    ? `${window.location.origin}/register?ref=${referralCode}` 
    : "";

  useEffect(() => {
    if (user?.id) {
      fetchReferralData();
    }
  }, [user?.id]);

  const fetchReferralData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const supabase = getSupabase();

    try {
      // Get all users referred by this user
      const { data: referredUsers, error } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("referred_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check which referrals have made deposits
      const referralsWithStatus: Referral[] = [];
      let successfulCount = 0;

      const referredList = (referredUsers || []) as Array<{ id: string; full_name: string | null; created_at: string }>;
      
      for (const referredUser of referredList) {
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", referredUser.id)
          .eq("type", "deposit")
          .eq("status", "success");

        const hasDeposited = (count || 0) > 0;
        if (hasDeposited) successfulCount++;

        referralsWithStatus.push({
          id: referredUser.id,
          full_name: referredUser.full_name || "Anonymous",
          created_at: referredUser.created_at,
          has_deposited: hasDeposited,
        });
      }

      // Get total referral earnings from transactions
      const { data: earningsData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "deposit")
        .eq("status", "success")
        .ilike("description", "%Referral bonus%");

      const earningsList = (earningsData || []) as Array<{ amount: number }>;
      const totalEarnings = earningsList.reduce((sum, t) => sum + (t.amount || 0), 0);

      setReferrals(referralsWithStatus);
      setStats({
        totalReferrals: referredList.length,
        successfulReferrals: successfulCount,
        pendingReferrals: referredList.length - successfulCount,
        totalEarnings,
        availableBalance: user?.balance || 0,
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success("Referral code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const shareOnWhatsApp = () => {
    const message = `🎉 Join TADA VTU and get instant airtime & data at the best prices!\n\nUse my referral code: ${referralCode}\n\nSign up here: ${referralLink}\n\nWe both get ₦100 airtime bonus when you make your first deposit! 💰`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleWithdrawAirtime = async () => {
    if (!withdrawPhone || !/^0\d{10}$/.test(withdrawPhone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (stats.availableBalance < 100) {
      toast.error("Minimum withdrawal is ₦100");
      return;
    }

    setWithdrawing(true);

    try {
      const response = await fetch("/api/referral/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: withdrawPhone,
          network: withdrawNetwork,
          amount: Math.min(stats.availableBalance, 500), // Max ₦500 per withdrawal
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`₦${data.amount} airtime sent to ${withdrawPhone}!`);
        setShowWithdrawModal(false);
        setWithdrawPhone("");
        fetchReferralData();
      } else {
        toast.error(data.error || "Withdrawal failed");
      }
    } catch (error) {
      toast.error("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

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
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors lg:hidden">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Referral & Rewards</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-500">{stats.successfulReferrals}</p>
              <p className="text-xs text-muted-foreground">Successful Referrals</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-500">₦{stats.totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Your Referral Code */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="gift" size="20px" color="#22c55e" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground tracking-wider">{referralCode}</p>
              </div>
              <Button variant="outline" size="icon" onClick={copyReferralCode} className="h-12 w-12">
                <IonIcon name={copied ? "checkmark" : "copy-outline"} size="20px" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyReferralLink} variant="outline" className="flex-1 h-10">
                <IonIcon name="link-outline" size="18px" className="mr-2" />
                Copy Link
              </Button>
              <Button onClick={shareOnWhatsApp} className="flex-1 h-10 bg-green-500 hover:bg-green-600">
                <IonIcon name="logo-whatsapp" size="18px" className="mr-2" />
                Share
              </Button>
            </div>

            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-sm text-green-500 font-medium">
                🎁 Earn ₦100 airtime for every friend who signs up and makes their first deposit!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Withdraw Earnings */}
        {stats.availableBalance >= 100 && (
          <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-green-500">₦{stats.availableBalance.toLocaleString()}</p>
                </div>
                <Button onClick={() => setShowWithdrawModal(true)} className="bg-green-500 hover:bg-green-600">
                  <IonIcon name="phone-portrait-outline" size="18px" className="mr-2" />
                  Get Airtime
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How It Works */}
        <Card className="border-border">
          <CardHeader className="pb-3">
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
                <p className="font-medium text-foreground">Share Your Code</p>
                <p className="text-sm text-muted-foreground">Send your referral link to friends via WhatsApp, SMS, or social media</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-500 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Friend Signs Up</p>
                <p className="text-sm text-muted-foreground">They create an account using your referral code</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-500 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Both Get Rewarded</p>
                <p className="text-sm text-muted-foreground">When they make their first deposit, you both get ₦100 bonus!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Referrals */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="people-outline" size="20px" color="#22c55e" />
              Your Referrals ({stats.totalReferrals})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="people-outline" size="32px" className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-1">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <IonIcon name="person" size="20px" color="#22c55e" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{referral.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      referral.has_deposited 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-yellow-500/20 text-yellow-500"
                    }`}>
                      {referral.has_deposited ? "✓ Earned ₦100" : "Pending deposit"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-sm border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Withdraw as Airtime</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground">
                <IonIcon name="close" size="24px" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Network</label>
                <select
                  value={withdrawNetwork}
                  onChange={(e) => setWithdrawNetwork(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                >
                  <option value="MTN">MTN</option>
                  <option value="GLO">GLO</option>
                  <option value="AIRTEL">Airtel</option>
                  <option value="9MOBILE">9mobile</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">₦{Math.min(stats.availableBalance, 500)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Max ₦500 per withdrawal</p>
              </div>
              <Button
                onClick={handleWithdrawAirtime}
                disabled={withdrawing}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {withdrawing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Withdraw Airtime"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
