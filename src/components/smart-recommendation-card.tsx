"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import type { SmartRecommendation } from "@/types/database";
import { formatSavings } from "@/lib/smart-optimizer";

interface SmartRecommendationCardProps {
  recommendation: SmartRecommendation;
  onAccept: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export function SmartRecommendationCard({
  recommendation,
  onAccept,
  onDismiss,
}: SmartRecommendationCardProps) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(recommendation.id);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await onDismiss(recommendation.id);
      setDismissed(true);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (recommendation.recommendation_type) {
      case "plan_switch":
        return "swap-horizontal";
      case "timing":
        return "time-outline";
      case "bundle":
        return "layers-outline";
      case "savings_tip":
        return "bulb-outline";
      default:
        return "sparkles-outline";
    }
  };

  const getColor = () => {
    switch (recommendation.recommendation_type) {
      case "plan_switch":
        return "#22c55e";
      case "timing":
        return "#3b82f6";
      case "bundle":
        return "#8b5cf6";
      case "savings_tip":
        return "#f59e0b";
      default:
        return "#22c55e";
    }
  };

  return (
    <Card className="border-border overflow-hidden animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${getColor()}20` }}
            >
              <IonIcon name={getIcon()} size="20px" color={getColor()} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                💡 Smart Tip
              </CardTitle>
              {recommendation.confidence_score && (
                <p className="text-xs text-muted-foreground">
                  {recommendation.confidence_score}% confidence
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <IonIcon name="close" size="18px" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div>
          <h4 className="font-medium text-foreground">{recommendation.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {recommendation.description}
          </p>
        </div>

        {recommendation.potential_savings && recommendation.potential_savings > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
            <IonIcon name="trending-down" size="20px" color="#22c55e" />
            <span className="text-sm font-medium text-green-600">
              Save {formatSavings(recommendation.potential_savings)}/month
            </span>
            {recommendation.savings_percentage && (
              <span className="text-xs text-green-500 bg-green-500/20 px-2 py-0.5 rounded-full">
                {recommendation.savings_percentage.toFixed(0)}% less
              </span>
            )}
          </div>
        )}

        {recommendation.reasoning && (
          <p className="text-xs text-muted-foreground italic">
            {recommendation.reasoning}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600"
            size="sm"
          >
            {loading ? (
              <IonIcon name="sync" size="16px" className="animate-spin" />
            ) : (
              <>
                <IonIcon name="checkmark" size="16px" className="mr-1" />
                Apply
              </>
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard sidebar
export function SmartTipBadge({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors"
    >
      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
        <IonIcon name="bulb" size="16px" color="#22c55e" />
      </div>
      <div className="text-left">
        <p className="text-xs text-muted-foreground">Smart Tips</p>
        <p className="text-sm font-medium text-foreground">
          {count} suggestion{count > 1 ? "s" : ""}
        </p>
      </div>
      <IonIcon name="chevron-forward" size="16px" className="text-muted-foreground" />
    </button>
  );
}
