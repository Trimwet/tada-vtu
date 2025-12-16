"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { browserCache } from "@/lib/cache";
import { FAVORITE_AMOUNTS } from "@/lib/loyalty";

interface QuickRechargeItem {
  id: string;
  phone: string;
  network: string;
  name?: string;
  lastAmount?: number;
  lastUsed: number;
  type?: "airtime" | "data";
}

interface QuickRechargeProps {
  onSelect: (item: QuickRechargeItem) => void;
  onAmountSelect?: (amount: number) => void;
  currentNetwork?: string;
  showAmounts?: boolean;
}

const STORAGE_KEY = "quick_recharge_favorites";

export function QuickRecharge({
  onSelect,
  onAmountSelect,
  currentNetwork,
  showAmounts = true,
}: QuickRechargeProps) {
  const [favorites, setFavorites] = useState<QuickRechargeItem[]>([]);

  useEffect(() => {
    const stored = browserCache.get<QuickRechargeItem[]>(STORAGE_KEY);
    if (stored) {
      const sorted = stored
        .filter((item) => !currentNetwork || item.network === currentNetwork)
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 4);
      setFavorites(sorted);
    }
  }, [currentNetwork]);

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      MTN: "bg-yellow-500",
      AIRTEL: "bg-red-500",
      GLO: "bg-green-600",
      "9MOBILE": "bg-green-400",
    };
    return colors[network.toUpperCase()] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Favorite Amounts */}
      {showAmounts && onAmountSelect && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <IonIcon name="cash-outline" size="16px" color="#22c55e" />
            <span className="text-sm font-medium text-foreground">
              Quick Amounts
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FAVORITE_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => onAmountSelect(amount)}
                className="h-9 px-4 text-sm font-medium hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500"
              >
                ₦{amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Numbers */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <IonIcon name="flash" size="16px" color="#f59e0b" />
            <span className="text-sm font-medium text-foreground">
              Quick Recharge
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {favorites.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                onClick={() => onSelect(item)}
                className="flex-shrink-0 h-auto py-2 px-3 flex items-center gap-2 hover:bg-green-500/10 hover:border-green-500/50"
              >
                <div
                  className={`w-7 h-7 rounded-full ${getNetworkColor(item.network)} flex items-center justify-center`}
                >
                  <span className="text-white text-xs font-bold">
                    {item.network.charAt(0)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">
                    {item.name || item.phone}
                  </p>
                  {item.lastAmount && (
                    <p className="text-xs text-green-500">
                      ₦{item.lastAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Buy Again Card - Shows recent successful transactions
interface BuyAgainProps {
  transactions: Array<{
    id: string;
    type: string;
    phone_number: string;
    network: string;
    amount: number;
    description?: string;
    created_at: string;
  }>;
  onBuyAgain: (tx: BuyAgainProps["transactions"][0]) => void;
}

export function BuyAgainCard({ transactions, onBuyAgain }: BuyAgainProps) {
  if (transactions.length === 0) return null;

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      MTN: "bg-yellow-500",
      AIRTEL: "bg-red-500",
      GLO: "bg-green-600",
      "9MOBILE": "bg-green-400",
    };
    return colors[network?.toUpperCase()] || "bg-gray-500";
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      airtime: "call",
      data: "wifi",
      cable: "tv",
      electricity: "flash",
    };
    return icons[type] || "card";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IonIcon name="refresh" size="16px" color="#3b82f6" />
          <span className="text-sm font-medium text-foreground">Buy Again</span>
        </div>
      </div>
      <div className="space-y-2">
        {transactions.slice(0, 3).map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${getNetworkColor(tx.network)} flex items-center justify-center`}
              >
                <IonIcon name={getTypeIcon(tx.type)} size="20px" color="white" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {tx.description || `${tx.type} - ${tx.network}`}
                </p>
                <p className="text-xs text-muted-foreground">{tx.phone_number}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onBuyAgain(tx)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              ₦{tx.amount.toLocaleString()}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Standalone Quick Recharge Card for Dashboard
interface QuickRechargeCardProps {
  recentTransactions?: Array<{
    id: string;
    type: string;
    phone_number?: string | null;
    network?: string | null;
    amount: number;
    description?: string | null;
    created_at: string;
  }>;
  onBuyAgain?: (tx: {
    type: string;
    phone_number: string;
    network: string;
    amount: number;
  }) => void;
  onQuickAmount?: (amount: number) => void;
}

export function QuickRechargeCard({
  recentTransactions = [],
  onBuyAgain,
  onQuickAmount,
}: QuickRechargeCardProps) {
  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      MTN: "bg-yellow-500",
      AIRTEL: "bg-red-500",
      GLO: "bg-green-600",
      "9MOBILE": "bg-green-400",
    };
    return colors[network?.toUpperCase()] || "bg-muted";
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      airtime: "call",
      data: "wifi",
      cable: "tv",
      electricity: "flash",
    };
    return icons[type] || "card";
  };

  // Filter to only airtime/data transactions with phone numbers
  const rechargeTransactions = recentTransactions
    .filter(
      (tx) =>
        (tx.type === "airtime" || tx.type === "data") &&
        tx.phone_number &&
        tx.network
    )
    .slice(0, 3);

  return (
    <Card
      className="border-border animate-slide-up"
      style={{ animationDelay: "0.25s" }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <IonIcon name="flash" size="16px" color="#22c55e" />
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Quick Amounts */}
        {onQuickAmount && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick Airtime</p>
            <div className="grid grid-cols-3 gap-2">
              {[100, 200, 500, 1000, 2000, 5000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickAmount(amount)}
                  className="h-9 text-xs font-medium hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500 transition-smooth"
                >
                  ₦{amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Buy Again */}
        {rechargeTransactions.length > 0 && onBuyAgain && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Buy Again</p>
            <div className="space-y-2">
              {rechargeTransactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() =>
                    onBuyAgain({
                      type: tx.type,
                      phone_number: tx.phone_number!,
                      network: tx.network!,
                      amount: Math.abs(tx.amount),
                    })
                  }
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-smooth group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg ${getNetworkColor(tx.network || "")} flex items-center justify-center`}
                    >
                      <IonIcon
                        name={getTypeIcon(tx.type)}
                        size="16px"
                        color="white"
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {tx.phone_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.network} {tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-500">
                      ₦{Math.abs(tx.amount).toLocaleString()}
                    </span>
                    <IonIcon
                      name="chevron-forward"
                      size="16px"
                      className="text-muted-foreground group-hover:text-green-500 transition-colors"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {rechargeTransactions.length === 0 && !onQuickAmount && (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2">
              <IonIcon
                name="time-outline"
                size="24px"
                className="text-muted-foreground"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Your recent purchases will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to save a recharge to favorites
export function saveToQuickRecharge(
  item: Omit<QuickRechargeItem, "id" | "lastUsed">
) {
  const stored = browserCache.get<QuickRechargeItem[]>(STORAGE_KEY) || [];

  const existingIndex = stored.findIndex(
    (f) => f.phone === item.phone && f.network === item.network
  );

  const newItem: QuickRechargeItem = {
    ...item,
    id: existingIndex >= 0 ? stored[existingIndex].id : Date.now().toString(),
    lastUsed: Date.now(),
  };

  if (existingIndex >= 0) {
    stored[existingIndex] = newItem;
  } else {
    stored.unshift(newItem);
  }

  const trimmed = stored.slice(0, 10);
  browserCache.set(STORAGE_KEY, trimmed, 60 * 24 * 30);

  return newItem;
}

// Remove from favorites
export function removeFromQuickRecharge(id: string) {
  const stored = browserCache.get<QuickRechargeItem[]>(STORAGE_KEY) || [];
  const filtered = stored.filter((item) => item.id !== id);
  browserCache.set(STORAGE_KEY, filtered, 60 * 24 * 30);
}
