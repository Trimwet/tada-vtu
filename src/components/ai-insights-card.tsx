"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";

interface SpendingData {
  totalSpent: number;
  airtimeSpent: number;
  dataSpent: number;
  cableSpent?: number;
  electricitySpent?: number;
  topNetwork?: string;
  transactionCount: number;
  avgTransaction?: number;
  dataGB: number;
}

interface DataPlan {
  network: string;
  size: string;
  sizeGB: number;
  price: number;
  validity: string;
  pricePerGB: number;
}

interface AIInsightsCardProps {
  spendingData: SpendingData;
  className?: string;
}

// Network icons and colors
const NETWORK_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  MTN: { icon: "cellular", color: "#FFCC00", bgColor: "rgba(255, 204, 0, 0.15)" },
  AIRTEL: { icon: "radio", color: "#FF0000", bgColor: "rgba(255, 0, 0, 0.15)" },
  GLO: { icon: "globe", color: "#00A95C", bgColor: "rgba(0, 169, 92, 0.15)" },
};

export function AIInsightsCard({ spendingData, className = "" }: AIInsightsCardProps) {
  const [activeTab, setActiveTab] = useState<"insight" | "summary" | "deals">("insight");
  const [insight, setInsight] = useState<{ insight: string; tip: string; savingsPotential: number } | null>(null);
  const [summary, setSummary] = useState<{ summary: string; highlights: string[]; recommendation: string } | null>(null);
  const [deals, setDeals] = useState<{ deals: DataPlan[]; bestOverall: DataPlan; comparison: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsight();
  }, []);

  const fetchData = async (type: string, data: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadInsight = async () => {
    const data = await fetchData("spending-insight", {
      ...spendingData,
      cableSpent: spendingData.cableSpent || 0,
      electricitySpent: spendingData.electricitySpent || 0,
      topNetwork: spendingData.topNetwork || "MTN",
      avgTransaction: spendingData.avgTransaction || Math.round(spendingData.totalSpent / (spendingData.transactionCount || 1)),
    });
    if (data) setInsight(data);
  };

  const loadSummary = async () => {
    if (summary) return;
    const data = await fetchData("transaction-summary", { 
      period: "month",
      spending: spendingData 
    });
    if (data) setSummary(data);
  };

  const loadDeals = async () => {
    if (deals) return;
    const data = await fetchData("best-deals-all");
    if (data) setDeals(data);
  };

  const handleTabChange = (tab: "insight" | "summary" | "deals") => {
    setActiveTab(tab);
    if (tab === "summary") loadSummary();
    if (tab === "deals") loadDeals();
  };

  // Format currency
  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  // Calculate spending percentages for summary
  const getSpendingBreakdown = () => {
    const total = spendingData.totalSpent || 1;
    return {
      airtime: Math.round((spendingData.airtimeSpent / total) * 100),
      data: Math.round((spendingData.dataSpent / total) * 100),
      cable: Math.round(((spendingData.cableSpent || 0) / total) * 100),
      electricity: Math.round(((spendingData.electricitySpent || 0) / total) * 100),
    };
  };

  return (
    <Card className={`border-border overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
              <IonIcon name="sparkles" size="20px" color="#a855f7" />
            </div>
            <span>AI Insights</span>
          </CardTitle>
          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full font-medium">
            ✨ AI Powered
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4">
          {[
            { id: "insight", label: "Smart Tip", icon: "bulb" },
            { id: "summary", label: "Summary", icon: "pie-chart" },
            { id: "deals", label: "Best Deals", icon: "flash" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as "insight" | "summary" | "deals")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <IonIcon name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`} size="14px" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[200px] gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Analyzing your data...</p>
            </div>
          ) : (
            <>
              {/* Smart Tip Tab */}
              {activeTab === "insight" && (
                <div className="space-y-4">
                  {insight ? (
                    <>
                      <div className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl border border-purple-500/10">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center shrink-0">
                            <IonIcon name="bulb" size="20px" color="#a855f7" />
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {insight.insight}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                          <IonIcon name="trending-up" size="24px" color="#22c55e" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Potential Monthly Savings</p>
                          <p className="text-xl font-bold text-green-500">{formatMoney(insight.savingsPotential)}</p>
                        </div>
                        <IonIcon name="chevron-forward" size="20px" className="text-muted-foreground" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <IonIcon name="analytics-outline" size="32px" className="text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Make some transactions to get personalized tips!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  {/* Spending Overview */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <IonIcon name="wallet" size="16px" color="#3b82f6" />
                        </div>
                        <span className="text-xs text-muted-foreground">Total Spent</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{formatMoney(spendingData.totalSpent)}</p>
                    </div>
                    
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                          <IonIcon name="receipt" size="16px" color="#f97316" />
                        </div>
                        <span className="text-xs text-muted-foreground">Transactions</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{spendingData.transactionCount}</p>
                    </div>
                  </div>

                  {/* Spending Breakdown */}
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-3 font-medium">Spending Breakdown</p>
                    <div className="space-y-3">
                      {[
                        { label: "Airtime", amount: spendingData.airtimeSpent, icon: "call", color: "#22c55e", percent: getSpendingBreakdown().airtime },
                        { label: "Data", amount: spendingData.dataSpent, icon: "wifi", color: "#3b82f6", percent: getSpendingBreakdown().data },
                        { label: "Cable TV", amount: spendingData.cableSpent || 0, icon: "tv", color: "#f97316", percent: getSpendingBreakdown().cable },
                        { label: "Electricity", amount: spendingData.electricitySpent || 0, icon: "flash", color: "#eab308", percent: getSpendingBreakdown().electricity },
                      ].filter(item => item.amount > 0).map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <IonIcon name={item.icon} size="16px" color={item.color} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-foreground">{item.label}</span>
                              <span className="text-xs font-semibold text-foreground">{formatMoney(item.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{item.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary */}
                  {summary && (
                    <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                      <div className="flex items-start gap-2">
                        <IonIcon name="sparkles" size="16px" color="#a855f7" className="mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground leading-relaxed">{summary.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Best Deals Tab */}
              {activeTab === "deals" && (
                <div className="space-y-4">
                  {deals ? (
                    <>
                      {/* Best Overall Deal */}
                      <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🏆</span>
                          <span className="text-xs font-semibold text-amber-500">BEST VALUE</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: NETWORK_CONFIG[deals.bestOverall.network]?.bgColor || "rgba(136, 136, 136, 0.15)" }}
                            >
                              <IonIcon 
                                name={NETWORK_CONFIG[deals.bestOverall.network]?.icon || "cellular"} 
                                size="20px" 
                                color={NETWORK_CONFIG[deals.bestOverall.network]?.color || "#888"} 
                              />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{deals.bestOverall.network}</p>
                              <p className="text-sm text-muted-foreground">{deals.bestOverall.size} • {deals.bestOverall.validity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-500">{formatMoney(deals.bestOverall.price)}</p>
                            <p className="text-xs text-muted-foreground">{formatMoney(deals.bestOverall.pricePerGB)}/GB</p>
                          </div>
                        </div>
                      </div>

                      {/* All Network Deals */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium px-1">Compare Networks</p>
                        {deals.deals.map((deal) => {
                          const config = NETWORK_CONFIG[deal.network] || { icon: "cellular", color: "#888", bgColor: "rgba(136, 136, 136, 0.15)" };
                          const isBest = deal.network === deals.bestOverall.network;
                          
                          return (
                            <div
                              key={deal.network}
                              className={`p-3 rounded-xl border transition-all ${
                                isBest
                                  ? "border-green-500/30 bg-green-500/5"
                                  : "border-border bg-muted/20 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                                  style={{ backgroundColor: config.bgColor }}
                                >
                                  <IonIcon name={config.icon} size="20px" color={config.color} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">{deal.network}</span>
                                    {isBest && (
                                      <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                                        BEST
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{deal.size} • {deal.validity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-foreground">{formatMoney(deal.price)}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatMoney(deal.pricePerGB)}/GB</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* AI Tip */}
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-start gap-2">
                          <IonIcon name="bulb" size="16px" color="#a855f7" className="mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{deals.comparison}</p>
                        </div>
                      </div>

                      {/* Buy Button */}
                      <Link href="/dashboard/buy-data">
                        <Button size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white h-11">
                          <IonIcon name="cart" size="18px" className="mr-2" />
                          Buy Data Now
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <IonIcon name="pricetag-outline" size="32px" className="text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Loading best deals...</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
