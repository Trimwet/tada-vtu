"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IonIcon } from "@/components/ion-icon";
import { useDataVault } from "@/hooks/useDataVault";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { VaultCarousel } from "@/components/vault-ready-card";
import { toast } from "@/lib/toast";
import Link from "next/link";
import confetti from "canvas-confetti";

type TabKey = "ready" | "delivered" | "expired" | "insights";

// ── Insights Tab ──────────────────────────────────────────────────────────

function InsightsTab({ vaultData }: { vaultData: any }) {
  const all = useMemo(() => [
    ...(vaultData?.ready || []),
    ...(vaultData?.delivered || []),
    ...(vaultData?.expired || []),
  ], [vaultData]);

  const delivered = vaultData?.delivered || [];
  const totalSpent = all.reduce((s: number, v: any) => s + Number(v.amount), 0);
  const totalDelivered = delivered.reduce((s: number, v: any) => s + Number(v.amount), 0);
  const uniqueRecipients = new Set(delivered.map((v: any) => v.recipient_phone)).size;

  const networkCounts = delivered.reduce((acc: Record<string, number>, v: any) => {
    acc[v.network] = (acc[v.network] || 0) + 1;
    return acc;
  }, {});
  const topNetwork = Object.entries(networkCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "—";

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    delivered.forEach((v: any) => {
      const month = new Date(v.purchased_at).toLocaleDateString("en-NG", { month: "short", year: "2-digit" });
      map[month] = (map[month] || 0) + Number(v.amount);
    });
    return Object.entries(map).slice(-6);
  }, [delivered]);

  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  if (all.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <IonIcon name="bar-chart-outline" size="32px" className="text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">No data yet</p>
        <p className="text-sm text-muted-foreground">Park and deliver data to see your gifting insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Spent", value: `₦${totalSpent.toLocaleString()}`, icon: "wallet", color: "#16a34a" },
          { label: "Total Delivered", value: `₦${totalDelivered.toLocaleString()}`, icon: "send", color: "#2563eb" },
          { label: "Unique Recipients", value: uniqueRecipients.toString(), icon: "people", color: "#8b5cf6" },
          { label: "Top Network", value: topNetwork, icon: "wifi", color: "#d97706" },
        ].map((stat) => (
          <div key={stat.label} className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <IonIcon name={stat.icon} size="14px" color={stat.color} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-lg font-bold text-foreground tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {monthlyData.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Monthly gifting (₦)</p>
          <div className="flex items-end gap-2 h-20">
            {monthlyData.map(([month, value]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-green-500/80 rounded-t-sm transition-all"
                  style={{ height: `${(value / maxMonthly) * 64}px`, minHeight: "4px" }}
                />
                <p className="text-[9px] text-muted-foreground truncate w-full text-center">{month}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(networkCounts).length > 0 && (
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">By network</p>
          <div className="space-y-2">
            {Object.entries(networkCounts)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([network, count]) => (
                <div key={network} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold w-12">{network}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${((count as number) / delivered.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{count as any} items</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Network Reliability (Public Stats) */}
      <NetworkReliabilitySection />
    </div>
  );
}

function NetworkReliabilitySection() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch('/api/data-vault/network-stats')
      .then(r => r.json())
      .then(res => {
        if (res.status) setStats(res.data);
        setLoading(false);
      });
  });

  if (loading || stats.length === 0) return null;

  return (
    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-green-600 flex items-center gap-1.5 uppercase tracking-wider">
          <IonIcon name="pulse-outline" size="14px" />
          Live Network Reliability
        </p>
        <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20">
          Last 24h
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.network} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-bold">{s.network}</span>
              <span className={Number(s.success_rate) > 95 ? "text-green-600" : "text-amber-600"}>
                {s.success_rate}%
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${Number(s.success_rate) > 95 ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${s.success_rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-3 leading-relaxed">
        Reliability score is based on the last 100 delivery attempts across the TADA network.
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function DataVaultPage() {
  const { user } = useSupabaseUser();
  const { vaultData, loading, isDelivering, isRefunding, deliverData, refundData, refresh } = useDataVault(user?.id);
  const [activeTab, setActiveTab] = useState<TabKey>("ready");

  const readyItems = useMemo(() => vaultData?.ready || [], [vaultData?.ready]);
  const deliveredItems = useMemo(() => vaultData?.delivered || [], [vaultData?.delivered]);
  const expiredItems = useMemo(() => vaultData?.expired || [], [vaultData?.expired]);
  const stats = useMemo(() => vaultData?.stats, [vaultData?.stats]);

  const tabs = useMemo(() => [
    { key: "ready" as TabKey, label: "Ready", count: readyItems.length, items: readyItems },
    { key: "delivered" as TabKey, label: "Delivered", count: deliveredItems.length, items: deliveredItems },
    { key: "expired" as TabKey, label: "Expired", count: expiredItems.length, items: expiredItems },
    { key: "insights" as TabKey, label: "Insights", count: 0, items: [] },
  ], [readyItems, deliveredItems, expiredItems]);

  const activeItems = useMemo(
    () => tabs.find((t) => t.key === activeTab)?.items || [],
    [tabs, activeTab]
  );

  const handleDeliver = async (vaultId: string) => {
    if (!user?.id) return toast.error("Please log in");
    try {
      const result = await deliverData(vaultId, user.id);
      if (result.status) {
        toast.success(result.message);
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#22c55e", "#16a34a", "#ffffff"] });
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to deliver data. Please try again.");
    }
  };

  const handleRefund = async (vaultId: string) => {
    if (!user?.id) return toast.error("Please log in");
    if (!confirm("Are you sure you want to refund this data? The balance will be returned to your wallet.")) return;
    try {
      const result = await refundData(vaultId, user.id);
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to process refund. Please try again.");
    }
  };

  const downloadReceipt = async (vaultId: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/data-vault/receipt/${vaultId}?userId=${user.id}`);
      const result = await res.json();
      if (!result.status) return toast.error("Could not fetch receipt");
      const r = result.data;
      const text = [
        "═══════════════════════════════",
        "        TADA VTU RECEIPT       ",
        "═══════════════════════════════",
        `Receipt ID:  ${r.receiptId}`,
        `Network:     ${r.network}`,
        `Plan:        ${r.planName}`,
        `Amount:      ₦${Number(r.amount).toLocaleString()}`,
        `Phone:       ${r.recipientPhone}`,
        `Status:      ${r.status.toUpperCase()}`,
        `Parked:      ${new Date(r.parkedAt).toLocaleString("en-NG")}`,
        r.deliveredAt ? `Delivered:   ${new Date(r.deliveredAt).toLocaleString("en-NG")}` : "",
        r.deliveryReference ? `Ref:         ${r.deliveryReference}` : "",
        "───────────────────────────────",
        "tadavtu.com",
      ].filter(Boolean).join("\n");

      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TADA-Receipt-${r.receiptId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded!");
    } catch {
      toast.error("Failed to download receipt");
    }
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 space-y-6 lg:max-w-7xl lg:mx-auto animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          <div className="h-9 w-24 bg-muted rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-12 w-full bg-muted rounded-xl" />
        <div className="border border-border rounded-xl p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 h-20 bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-6 space-y-6 lg:max-w-7xl lg:mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
              <IonIcon name="archive-outline" size="20px" color="#22c55e" />
            </div>
            Data Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your parked data plans</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/scan-qr">
            <Button variant="outline" className="gap-1.5 h-9 text-sm border-green-500/20 text-green-600 hover:bg-green-50">
              <IonIcon name="qr-code" size="16px" />
              <span className="hidden sm:inline">Scan QR</span>
              <span className="sm:hidden">Scan</span>
            </Button>
          </Link>
          <Link href="/dashboard/buy-data">
            <Button className="gap-1.5 h-9 text-sm bg-green-500 hover:bg-green-600">
              <IonIcon name="add-outline" size="16px" />
              <span className="hidden sm:inline">Park Data</span>
              <span className="sm:hidden">Park</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Ready to Send", value: `₦${stats?.totalParked.toLocaleString() || "0"}`, sub: `${stats?.readyCount || 0} items`, icon: "archive-outline", color: "#22c55e", bg: "bg-green-500/10" },
          { label: "Delivered", value: `₦${stats?.totalDelivered.toLocaleString() || "0"}`, sub: `${stats?.deliveredCount || 0} items`, icon: "checkmark-circle-outline", color: "#3b82f6", bg: "bg-blue-500/10" },
          { label: "Expired", value: stats?.expiredCount?.toString() || "0", sub: "Auto-refunded", icon: "time-outline", color: "#f59e0b", bg: "bg-amber-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <IonIcon name={s.icon} size="18px" color={s.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="relative bg-muted p-1 rounded-xl w-full overflow-x-auto">
        <div
          className="absolute top-1 bottom-1 bg-background rounded-lg shadow-sm transition-all duration-300 ease-out"
          style={{
            left: `calc(${tabs.findIndex((t) => t.key === activeTab) * (100 / tabs.length)}% + 4px)`,
            width: `calc(${100 / tabs.length}% - 8px)`,
          }}
        />
        <div className="relative flex min-w-max sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-1.5 flex-1 justify-center whitespace-nowrap ${
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                  activeTab === tab.key
                    ? "bg-green-500/15 text-green-600 border border-green-500/20"
                    : "bg-muted-foreground/10 text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">
            {activeTab === "ready" && "Ready to Send"}
            {activeTab === "delivered" && "Delivered Items"}
            {activeTab === "expired" && "Expired Items"}
            {activeTab === "insights" && "Gifting Insights"}
          </CardTitle>
          <CardDescription>
            {activeTab === "ready" && `Tap "Send Now" to deliver instantly`}
            {activeTab === "delivered" && "Successfully delivered data plans"}
            {activeTab === "expired" && "Expired items are automatically refunded"}
            {activeTab === "insights" && "Your data gifting activity at a glance"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === "insights" ? (
            <InsightsTab vaultData={vaultData} />
          ) : activeItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IonIcon
                  name={activeTab === "ready" ? "archive-outline" : activeTab === "delivered" ? "checkmark-circle-outline" : "time-outline"}
                  size="32px"
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-foreground font-medium mb-1">
                {activeTab === "ready" && "No Data Parked"}
                {activeTab === "delivered" && "No Delivered Items"}
                {activeTab === "expired" && "No Expired Items"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === "ready" && "Park data plans for instant delivery when needed"}
                {activeTab === "delivered" && "Delivered items will appear here"}
                {activeTab === "expired" && "Expired items are automatically refunded"}
              </p>
              {activeTab === "ready" && (
                <Link href="/dashboard/buy-data">
                  <Button className="gap-2">
                    <IonIcon name="add-outline" size="16px" />
                    Park Your First Data
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <VaultCarousel
              items={activeItems}
              tab={activeTab as "ready" | "delivered" | "expired"}
              isDelivering={isDelivering}
              isRefunding={isRefunding}
              onDeliver={handleDeliver}
              onRefund={handleRefund}
              onDownloadReceipt={downloadReceipt}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
