"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type TransactionStatus = "success" | "failed" | "pending";

interface TransactionConfirmationCardProps {
  status: TransactionStatus;
  orderId: string;
  paymentMethod: string;
  dateTime: string;
  totalAmount: string;
  description?: string;
  onGoToAccount: () => void;
  onTryAgain?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  success: {
    icon: <CheckCircle2 className="h-14 w-14 text-green-500" />,
    title: "Transaction Successful",
    subtitle: "Your order has been successfully submitted",
    iconBg: "bg-green-500/10 ring-green-500/20",
    buttonLabel: "Go to my account",
  },
  failed: {
    icon: <XCircle className="h-14 w-14 text-red-500" />,
    title: "Transaction Failed",
    subtitle: "Something went wrong with your order",
    iconBg: "bg-red-500/10 ring-red-500/20",
    buttonLabel: "Go to my account",
  },
  pending: {
    icon: <Clock className="h-14 w-14 text-yellow-500" />,
    title: "Transaction Pending",
    subtitle: "Your order is being processed",
    iconBg: "bg-yellow-500/10 ring-yellow-500/20",
    buttonLabel: "Go to my account",
  },
};

export function TransactionConfirmationCard({
  status,
  orderId,
  paymentMethod,
  dateTime,
  totalAmount,
  description,
  onGoToAccount,
  onTryAgain,
  className,
}: TransactionConfirmationCardProps) {
  const config = STATUS_CONFIG[status];

  const details = [
    { label: "Order ID", value: orderId },
    { label: "Payment Method", value: paymentMethod },
    ...(description ? [{ label: "Description", value: description }] : []),
    { label: "Date & Time", value: dateTime },
    { label: "Total", value: totalAmount, isBold: true },
  ];

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border bg-card text-card-foreground shadow-lg p-6 sm:p-8",
        "animate-in fade-in zoom-in-95 duration-300",
        className
      )}
      aria-live="polite"
    >
      <div className="flex flex-col items-center space-y-5 text-center">
        {/* Icon */}
        <div className={cn("p-4 rounded-full ring-4", config.iconBg)}>
          {config.icon}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>

        {/* Details */}
        <div className="w-full space-y-0 pt-2 border-t border-border">
          {details.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between py-3 text-sm",
                index < details.length - 1 && "border-b border-border/60"
              )}
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span
                className={cn(
                  "font-medium text-foreground text-right max-w-[55%] truncate",
                  item.isBold && "text-base font-bold text-green-500"
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full space-y-2 pt-2">
          <Button
            onClick={onGoToAccount}
            className="w-full h-12 text-sm font-semibold"
            size="lg"
          >
            {config.buttonLabel}
          </Button>
          {status === "failed" && onTryAgain && (
            <Button
              onClick={onTryAgain}
              variant="outline"
              className="w-full h-11 text-sm"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
