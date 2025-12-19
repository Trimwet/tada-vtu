"use client";

import { IonIcon } from "@/components/ion-icon";
import { TIER_DISPLAY, type PricingTier } from "@/lib/pricing-tiers";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier: PricingTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = "md", showLabel = true, className }: TierBadgeProps) {
  const display = TIER_DISPLAY[tier];
  
  const sizeClasses = {
    sm: { container: "gap-1", icon: "14px", text: "text-xs" },
    md: { container: "gap-1.5", icon: "16px", text: "text-sm" },
    lg: { container: "gap-2", icon: "20px", text: "text-base" },
  };
  
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full bg-muted/50 border border-border",
        sizes.container,
        className
      )}
    >
      <IonIcon name={display.icon} size={sizes.icon} color={display.color} />
      {showLabel && (
        <span className={cn("font-medium", sizes.text)} style={{ color: display.color }}>
          {display.name}
        </span>
      )}
    </div>
  );
}
