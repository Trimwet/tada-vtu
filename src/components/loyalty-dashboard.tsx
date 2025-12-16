"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import {
  TIER_CONFIG,
  getTierProgress,
  REDEMPTION_OPTIONS,
  type LoyaltyTier,
} from "@/lib/loyalty";

interface LoyaltyDashboardProps {
  points: number;
  totalPointsEarned: number;
  tier: LoyaltyTier;
  streak: number;
  longestStreak: number;
  spinAvailable: boolean;
  onOpenSpin: () => void;
  onRedeem?: (optionId: string) => void;
}

const TIER_ICONS: Record<LoyaltyTier, string> = {
  bronze: "shield-outline",
  silver: "shield-half-outline",
  gold: "shield",
  platinum: "diamond-outline",
};

export function LoyaltyDashboard({
  points,
  totalPointsEarned,
  tier,
  streak,
  longestStreak,
  spinAvailable,
  onOpenSpin,
  onRedeem,
}: LoyaltyDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "redeem" | "achievements"
  >("overview");
  const tierConfig = TIER_CONFIG[tier];
  const progress = getTierProgress(totalPointsEarned);

  return (
    <Card className="border-border overflow-hidden">
      {/* Header with Tier */}
      <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <IonIcon name={TIER_ICONS[tier]} size="24px" color="#22c55e" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Tier</p>
              <p className="text-xl font-bold text-foreground">
                {tierConfig.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available Points</p>
            <p className="text-2xl font-bold text-foreground">
              {points.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress to next tier */}
        {progress.nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{tierConfig.name}</span>
              <span>
                {progress.pointsToNext.toLocaleString()} pts to{" "}
                {TIER_CONFIG[progress.nextTier].name}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["overview", "redeem", "achievements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-green-500 border-b-2 border-green-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <IonIcon name="flame" size="20px" color="#f97316" />
                  <span className="text-xl font-bold text-foreground">
                    {streak}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <IonIcon name="trophy" size="20px" color="#a855f7" />
                  <span className="text-xl font-bold text-foreground">
                    {longestStreak}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <IonIcon name="star" size="20px" color="#22c55e" />
                  <span className="text-xl font-bold text-foreground">
                    {totalPointsEarned.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <IonIcon name="trending-up" size="20px" color="#3b82f6" />
                  <span className="text-xl font-bold text-foreground">
                    {tierConfig.pointsMultiplier}x
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Multiplier</p>
              </div>
            </div>

            {/* Daily Spin */}
            <Button
              onClick={onOpenSpin}
              disabled={!spinAvailable}
              className="w-full h-12 bg-green-500 hover:bg-green-600 disabled:opacity-50"
            >
              {spinAvailable ? (
                <span className="flex items-center gap-2">
                  <IonIcon name="sync" size="20px" />
                  Spin Daily Wheel
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IonIcon name="time-outline" size="20px" />
                  Come Back Tomorrow
                </span>
              )}
            </Button>

            {/* Tier Benefits */}
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Your Benefits
              </p>
              <ul className="space-y-2">
                {tierConfig.benefits.map((benefit, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <IonIcon
                      name="checkmark-circle"
                      size="16px"
                      color="#22c55e"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "redeem" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Redeem your points for rewards. You have{" "}
              <span className="text-green-500 font-bold">
                {points.toLocaleString()}
              </span>{" "}
              points.
            </p>
            {REDEMPTION_OPTIONS.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name={
                        option.type === "airtime"
                          ? "call"
                          : option.type === "data"
                            ? "wifi"
                            : "wallet"
                      }
                      size="20px"
                      color="#22c55e"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{option.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={points < option.pointsCost}
                  onClick={() => onRedeem?.(option.id)}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50"
                >
                  {option.pointsCost.toLocaleString()} pts
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="ribbon-outline" size="32px" color="#22c55e" />
            </div>
            <p className="font-medium text-foreground">Achievements coming soon!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete tasks to earn badges and bonus points.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard sidebar
export function LoyaltyCard({
  points,
  tier,
  streak,
  spinAvailable,
  onOpenSpin,
  onViewAll,
}: {
  points: number;
  tier: LoyaltyTier;
  streak: number;
  spinAvailable: boolean;
  onOpenSpin: () => void;
  onViewAll: () => void;
}) {
  const tierConfig = TIER_CONFIG[tier];

  return (
    <Card className="border-border animate-slide-up" style={{ animationDelay: "0.15s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name={TIER_ICONS[tier]} size="16px" color="#22c55e" />
            </div>
            {tierConfig.name}
          </CardTitle>
          <button
            onClick={onViewAll}
            className="text-xs text-green-500 hover:underline"
          >
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {points.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end opacity-50">
              <IonIcon name="flame" size="18px" color="#9ca3af" />
              <span className="text-xl font-bold text-muted-foreground">--</span>
            </div>
            <p className="text-xs text-muted-foreground">Coming Soon</p>
          </div>
        </div>

        {spinAvailable && (
          <Button
            onClick={onOpenSpin}
            size="sm"
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <IonIcon name="sync" size="16px" className="mr-2" />
            Spin & Win
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
