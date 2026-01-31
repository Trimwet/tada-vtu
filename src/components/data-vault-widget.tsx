"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { useDataVault } from "@/hooks/useDataVault";
import { toast } from "sonner";
import Link from "next/link";

interface DataVaultWidgetProps {
  userId: string;
}

export function DataVaultWidget({ userId }: DataVaultWidgetProps) {
  const { vaultData, loading, isDelivering, deliverData, refundData } = useDataVault(userId);
  const [isRefunding, setIsRefunding] = useState<string | null>(null);

  const handleDeliver = async (vaultId: string, planName: string, phone: string) => {
    try {
      const result = await deliverData(vaultId, userId);
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to deliver data');
    }
  };

  const handleRefund = async (vaultId: string) => {
    if (!confirm('Refund this plan to your wallet? Money will be returned instantly.')) return;

    setIsRefunding(vaultId);
    try {
      const result = await refundData(vaultId, userId);
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Refund failed');
    } finally {
      setIsRefunding(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <Card className="border-border animate-slide-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name="wallet-outline" size="16px" color="#22c55e" />
            </div>
            Data Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin animate-[spin_0.5s_linear_infinite]"></div>
        </CardContent>
      </Card>
    );
  }

  const readyItems = vaultData?.ready || [];
  const stats = vaultData?.stats;

  if (readyItems.length === 0) {
    return (
      <Card className="border-border animate-slide-up bg-white/[0.01]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name="wallet-outline" size="16px" color="#22c55e" />
            </div>
            Data Vault
          </CardTitle>
          <CardDescription className="text-sm">
            Park data plans for instant delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <IonIcon name="wallet-outline" size="32px" color="#22c55e" />
            </div>
            <h3 className="font-bold text-foreground text-lg mb-1">Vault Empty</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[200px] mx-auto leading-relaxed">
              Deduct money now, deliver data later with 1 tap.
            </p>
            <Link href="/dashboard/buy-data">
              <Button size="sm" className="gap-2 bg-green-500 hover:bg-green-600 text-black font-bold h-10 px-6 rounded-xl shadow-lg shadow-green-500/10">
                <IonIcon name="add-circle-outline" size="18px" />
                Fill Your Vault
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border animate-slide-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <IonIcon name="wallet-outline" size="16px" color="#22c55e" />
          </div>
          Data Vault
          <span className="ml-auto text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium">
            {readyItems.length} ready
          </span>
        </CardTitle>
        <CardDescription className="text-sm">
          ₦{stats?.totalParked.toLocaleString()} parked • {stats?.deliveredCount || 0} delivered
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {readyItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="border border-border rounded-xl p-3 hover:border-green-500/50 transition-smooth"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <IonIcon name="wallet-outline" size="18px" color="#22c55e" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground">
                      {item.network} {item.plan_name}
                    </p>
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {item.network}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.recipient_phone}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>₦{item.amount.toLocaleString()}</span>
                    <span>•</span>
                    <span className={new Date(item.expires_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'text-amber-500' : ''}>
                      {formatTimeRemaining(item.expires_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-green-500 hover:bg-green-600 text-black font-bold"
                  onClick={() => handleDeliver(item.id, item.plan_name, item.recipient_phone)}
                  disabled={isDelivering === item.id || isRefunding === item.id}
                >
                  {isDelivering === item.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin animate-[spin_0.5s_linear_infinite]"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <IonIcon name="send-outline" size="12px" />
                      Send Now
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => handleRefund(item.id)}
                  disabled={isDelivering === item.id || isRefunding === item.id}
                >
                  {isRefunding === item.id ? 'Refunding...' : 'Refund to Wallet'}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {readyItems.length > 3 && (
          <div className="text-center pt-2">
            <Link href="/dashboard/data-vault">
              <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-400 hover:bg-green-500/10">
                View all {readyItems.length} items
              </Button>
            </Link>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/buy-data" className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <IonIcon name="add-outline" size="12px" />
              Park More
            </Button>
          </Link>
          {readyItems.length > 0 && (
            <Link href="/dashboard/data-vault" className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <IonIcon name="list-outline" size="12px" />
                Manage
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}