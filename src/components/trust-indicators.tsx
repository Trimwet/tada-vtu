"use client";

import { IonIcon } from "@/components/ion-icon";
import { Badge } from "@/components/ui/badge";

interface TrustIndicatorsProps {
  variant?: "footer" | "checkout" | "inline";
  className?: string;
}

export function TrustIndicators({ variant = "inline", className = "" }: TrustIndicatorsProps) {
  const indicators = [
    { icon: "shield-checkmark", text: "SSL Secured", description: "256-bit encryption" },
    { icon: "card", text: "Flutterwave", description: "Secure payments" },
    { icon: "time", text: "Instant Delivery", description: "Under 5 seconds" },
    { icon: "people", text: "2,500+ Users", description: "Trusted platform" }
  ];

  if (variant === "footer") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 ${className}`}>
        {indicators.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-muted-foreground">
            <IonIcon name={item.icon} size="16px" className="text-green-500" />
            <span className="text-xs sm:text-sm">{item.text}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "checkout") {
    return (
      <div className={`bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <IonIcon name="shield-checkmark" size="20px" className="text-green-600" />
          <span className="font-semibold text-green-800 dark:text-green-200">Secure Transaction</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <IonIcon name="lock-closed" size="14px" className="text-green-600" />
            <span className="text-green-700 dark:text-green-300">SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <IonIcon name="card" size="14px" className="text-green-600" />
            <span className="text-green-700 dark:text-green-300">Flutterwave Secured</span>
          </div>
          <div className="flex items-center gap-2">
            <IonIcon name="eye-off" size="14px" className="text-green-600" />
            <span className="text-green-700 dark:text-green-300">PIN Protected</span>
          </div>
          <div className="flex items-center gap-2">
            <IonIcon name="refresh" size="14px" className="text-green-600" />
            <span className="text-green-700 dark:text-green-300">Instant Refund</span>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {indicators.slice(0, 2).map((item, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs">
          <IonIcon name={item.icon} size="12px" />
          {item.text}
        </Badge>
      ))}
    </div>
  );
}

// Security badge for forms
export function SecurityBadge() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
      <IonIcon name="lock-closed" size="12px" className="text-green-500" />
      <span>Your information is encrypted and secure</span>
    </div>
  );
}

// Professional certification badges
export function CertificationBadges() {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
          <IonIcon name="shield-checkmark" size="24px" className="text-green-600" />
        </div>
        <p className="text-xs text-muted-foreground">SSL Certified</p>
      </div>
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2">
          <IonIcon name="card" size="24px" className="text-blue-600" />
        </div>
        <p className="text-xs text-muted-foreground">PCI Compliant</p>
      </div>
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-2">
          <IonIcon name="business" size="24px" className="text-purple-600" />
        </div>
        <p className="text-xs text-muted-foreground">Registered Business</p>
      </div>
    </div>
  );
}
