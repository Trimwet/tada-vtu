"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { LogoInline } from "@/components/logo";
import Link from "next/link";
import { getTimeBasedGreeting } from "@/hooks/useGreeting";
import {
  useSupabaseUser,
  useSupabaseTransactions,
} from "@/hooks/useSupabaseUser";
import { AITypewriter } from "@/components/ai-typewriter";
import { LoadingScreen } from "@/components/loading-screen";
import { getSupabase } from "@/lib/supabase/client";
import { TierBadge } from "@/components/tier-badge";

import { getUserTier } from "@/lib/pricing-tiers";
import { useNotifications, checkAndNotifyMissingPhone } from "@/hooks/useNotifications";
import dynamic from "next/dynamic";

// Lazy load heavy components
const BankWithdrawalModal = dynamic(
  () => import("@/components/bank-withdrawal-modal").then(mod => ({ default: mod.BankWithdrawalModal })),
  { ssr: false }
);



export default function DashboardPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const { transactions: recentTransactions, loading: transactionsLoading } =
    useSupabaseTransactions(5);
  const { hasUnread } = useNotifications(user?.id);
  const [hideBalance, setHideBalance] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hideBalance") === "true";
    }
    return false;
  });

  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [allTransactions, setAllTransactions] = useState<
    typeof recentTransactions
  >([]);

  // Check if user needs to add phone number (for Google signups)
  useEffect(() => {
    if (user?.id && !user.phone_number) {
      checkAndNotifyMissingPhone(user.id, user.phone_number);
    }
  }, [user?.id, user?.phone_number]);

  // Fetch all transactions for this month - optimized with useCallback
  const fetchMonthlyData = useCallback(async () => {
    if (!user?.id) return;

    const supabase = getSupabase();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthTxns } = await supabase
      .from("transactions")
      .select("id, amount, type, status, description, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth)
      .order("created_at", { ascending: false })
      .limit(100);

    if (monthTxns) {
      setAllTransactions(monthTxns);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  // Calculate monthly stats from transactions - only count successful ones
  const monthlyStats = useMemo(() => {
    const stats = {
      totalSpent: 0,
      airtimeSpent: 0,
      dataSpent: 0,
      cableSpent: 0,
      electricitySpent: 0,
      dataGB: 0,
      transactionCount: 0,
      topNetwork: "",
    };

    const networkCounts: Record<string, number> = {};

    allTransactions.forEach((txn) => {
      // Only count successful transactions
      if (txn.status !== "success") return;
      
      if (txn.amount < 0) {
        const amount = Math.abs(txn.amount);
        stats.totalSpent += amount;
        stats.transactionCount++;

        // Track by type
        if (txn.type === "airtime") {
          stats.airtimeSpent += amount;
        } else if (txn.type === "data") {
          stats.dataSpent += amount;
          // Estimate GB from description (e.g., "MTN 2GB Data")
          const gbMatch = txn.description?.match(/(\d+(?:\.\d+)?)\s*GB/i);
          if (gbMatch) {
            stats.dataGB += parseFloat(gbMatch[1]);
          }
        } else if (txn.type === "cable") {
          stats.cableSpent += amount;
        } else if (txn.type === "electricity") {
          stats.electricitySpent += amount;
        }

        // Track network usage
        const networkMatch = txn.description?.match(/^(MTN|AIRTEL|GLO|9MOBILE|9mobile)/i);
        if (networkMatch) {
          const network = networkMatch[1].toUpperCase();
          networkCounts[network] = (networkCounts[network] || 0) + 1;
        }
      }
    });

    // Find top network
    const topNetworkEntry = Object.entries(networkCounts).sort((a, b) => b[1] - a[1])[0];
    stats.topNetwork = topNetworkEntry?.[0] || "MTN";

    return stats;
  }, [allTransactions]);

  const toggleHideBalance = () => {
    const newValue = !hideBalance;
    setHideBalance(newValue);
    localStorage.setItem("hideBalance", String(newValue));
  };

  // Services list - defined before any conditional returns
  const services = useMemo(() => [
    { name: "Airtime", icon: "call-outline", href: "/dashboard/buy-airtime" },
    { name: "Data", icon: "wifi-outline", href: "/dashboard/buy-data" },
    { name: "Cable TV", icon: "tv-outline", href: "/dashboard/cable-tv" },
    { name: "Electricity", icon: "flash-outline", href: "/dashboard/electricity" },
    { name: "Betting", icon: "football-outline", href: "/dashboard/betting" },
    { name: "Send Gift", icon: "gift-outline", href: "/dashboard/send-gift", badge: "NEW" },
  ], []);

  const timeGreeting = user
    ? getTimeBasedGreeting((user.full_name || "User").split(" ")[0]).greeting
    : "Welcome";

  // Show loading while user data is being fetched
  // AuthGuard handles the redirect if user is not authenticated
  if (userLoading || !user) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="overflow-x-hidden w-full max-w-full">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border lg:hidden safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <LogoInline size="sm" />
          <div className="flex items-center gap-1">
            <Link href="/dashboard/notifications">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-muted transition-smooth h-10 w-10"
              >
                <IonIcon name="notifications-outline" size="22px" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full pulse-green"></span>
                )}
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted transition-smooth h-10 w-10"
              >
                <IonIcon name="settings-outline" size="22px" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 py-4 lg:py-6 space-y-5 lg:space-y-6 lg:max-w-7xl lg:mx-auto">
        {/* Greeting */}
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground animate-fade-in">
              {timeGreeting}
            </h1>
            <TierBadge tier={getUserTier(user.total_spent || 0)} size="sm" />
          </div>
          <p className="text-muted-foreground h-6">
            <AITypewriter 
              userName={(user.full_name || "User").split(" ")[0]} 
              balance={user.balance || 0} 
              type="greeting" 
              speed={40}
            />
          </p>
        </div>

        {/* Wallet Card */}
        <Card className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 border-0 overflow-hidden shadow-lg shadow-green-500/20 animate-slide-up">
          <CardContent className="p-4 sm:p-6 relative">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-green-100 text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <IonIcon name="wallet-outline" size="14px" />
                    Available Balance
                    <button
                      onClick={toggleHideBalance}
                      className="p-1 hover:bg-white/10 rounded-full transition-smooth active:bg-white/20"
                      title={hideBalance ? "Show balance" : "Hide balance"}
                    >
                      <IonIcon
                        name={hideBalance ? "eye-off-outline" : "eye-outline"}
                        size="14px"
                        color="white"
                      />
                    </button>
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                    {hideBalance
                      ? "₦••••••"
                      : `₦${(user.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`}
                  </h2>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <IonIcon name="card-outline" size="20px" color="white" />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Link href="/dashboard/fund-wallet" className="flex-1">
                  <Button
                    size="sm"
                    className="w-full bg-white text-green-600 hover:bg-white/90 gap-1.5 sm:gap-2 font-semibold shadow-lg transition-smooth h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <IonIcon name="add-circle-outline" size="16px" />
                    Add Money
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 flex-1 gap-1.5 sm:gap-2 font-medium transition-smooth h-9 sm:h-10 text-xs sm:text-sm relative"
                  onClick={() => setShowWithdrawal(true)}
                >
                  <IonIcon name="arrow-up-circle-outline" size="16px" />
                  Withdraw
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[8px] font-bold rounded-full">
                    FREE
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Quick Services
            </h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {services.map((service, index) => (
              <Link key={service.name} href={service.href}>
                <Card
                  className={`border-border hover:border-green-500/50 active:scale-95 transition-smooth cursor-pointer group bg-card animate-scale-in stagger-${index + 1} relative overflow-hidden`}
                >
                  {"badge" in service && service.badge && (
                    <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 px-1 sm:px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] sm:text-[9px] font-bold rounded-full">
                      {service.badge}
                    </span>
                  )}
                  <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-smooth ${
                        "badge" in service
                          ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 group-hover:from-amber-500 group-hover:to-orange-500"
                          : "bg-green-500/10 group-hover:bg-green-500"
                      }`}
                    >
                      <IonIcon
                        name={service.icon}
                        size="22px"
                        color={"badge" in service ? "#f59e0b" : "#22c55e"}
                        className="group-hover:!text-white"
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-foreground">
                      {service.name}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>



        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
          {/* Transactions - Takes 3 columns */}
          <Card
            className="lg:col-span-3 border-border animate-slide-up overflow-hidden"
            style={{ animationDelay: "0.2s" }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Transactions
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Your latest activities
                  </CardDescription>
                </div>
                <Link href="/dashboard/transactions">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-500 hover:text-green-400 hover:bg-green-500/10 font-medium transition-smooth"
                  >
                    See all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IonIcon
                      name="receipt-outline"
                      size="32px"
                      className="text-muted-foreground"
                    />
                  </div>
                  <p className="text-foreground font-medium">
                    No transactions yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your transactions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentTransactions.map((transaction, index) => {
                    const date = new Date(transaction.created_at);
                    const formattedDate = date.toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={transaction.id}
                        className={`flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/50 transition-smooth overflow-hidden ${
                          index !== recentTransactions.length - 1
                            ? "border-b border-border/50"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              transaction.amount > 0
                                ? "bg-green-500/10"
                                : "bg-muted"
                            }`}
                          >
                            {transaction.amount > 0 ? (
                              <IonIcon
                                name="arrow-down"
                                size="18px"
                                color="#22c55e"
                              />
                            ) : (
                              <IonIcon
                                name="arrow-up"
                                size="18px"
                                className="text-muted-foreground"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground truncate max-w-[180px] sm:max-w-none">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formattedDate}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p
                            className={`font-semibold text-sm ${
                              transaction.status === "failed"
                                ? "text-foreground"
                                : transaction.amount > 0
                                  ? "text-green-500"
                                  : "text-foreground"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}₦
                            {Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          {transaction.status === "failed" ? (
                            <p className="text-xs text-red-500 font-medium">
                              failed
                            </p>
                          ) : transaction.status === "pending" ? (
                            <p className="text-xs text-amber-500 font-medium">
                              pending
                            </p>
                          ) : transaction.network ? (
                            <p className="text-xs text-muted-foreground">
                              {transaction.network}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Sidebar - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Monthly Stats */}
            <Card
              className="border-border animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  This Month
                </CardTitle>
                <CardDescription className="text-sm">
                  Spending summary
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <IonIcon name="trending-up" size="20px" color="#22c55e" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Total Spent
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    ₦{monthlyStats.totalSpent.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <IonIcon name="wifi" size="20px" color="#22c55e" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">
                        Data Purchased
                      </span>
                      {monthlyStats.dataGB > 0 && (
                        <span className="text-xs text-green-500">
                          {monthlyStats.dataGB}GB total
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-foreground">
                    ₦{monthlyStats.dataSpent.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <IonIcon name="call" size="20px" color="#22c55e" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Airtime
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    ₦{monthlyStats.airtimeSpent.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Referral Card - Coming Soon */}
            <Card
              className="border-border animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <IonIcon name="gift-outline" size="16px" className="text-muted-foreground" />
                  </div>
                  Refer & Earn
                </CardTitle>
                <CardDescription className="text-sm">
                  Referral program
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                    <IonIcon name="time-outline" size="24px" className="text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Coming Soon</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Exciting rewards await!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      {/* Bank Withdrawal Modal - Zero Fees via SMEPlug */}
      <BankWithdrawalModal
        isOpen={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        userId={user.id}
        balance={user.balance || 0}
        onSuccess={() => {
          // Refresh user data
          window.location.reload();
        }}
      />
    </div>
  );
}
