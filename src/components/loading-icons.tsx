"use client";

import { SendIcon } from "@/components/ui/send";
import { ZapIcon } from "@/components/ui/zap";
import { RadioIcon } from "@/components/ui/radio";
import { HourglassIcon } from "@/components/ui/hourglass";
import { cn } from "@/lib/utils";

// Spinner - proper rotating loader for loading states
function SpinnerIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <div 
      className={cn("border-2 border-green-500 border-t-transparent rounded-full animate-spin", className)}
      style={{ width: size, height: size }}
    />
  );
}

// Loading state types
export type LoadingType = "loading" | "sending" | "processing" | "waiting";

// Send Icon - for sending states
export function LoadingSend({ 
  className, 
  size = 20 
}: { 
  className?: string; 
  size?: number 
}) {
  return (
    <SendIcon 
      className={cn("text-green-500", className)} 
      size={size}
    />
  );
}

// Zap Icon - for processing/power states
export function LoadingProcessing({ 
  className, 
  size = 20 
}: { 
  className?: string; 
  size?: number 
}) {
  return (
    <ZapIcon 
      className={cn("text-yellow-500", className)} 
      size={size}
    />
  );
}

// Radio Icon - for loading/fetching states
export function LoadingFetch({ 
  className, 
  size = 20 
}: { 
  className?: string; 
  size?: number 
}) {
  return (
    <RadioIcon 
      className={cn("text-green-500", className)} 
      size={size}
    />
  );
}

// Hourglass Icon - for waiting/pending states
export function LoadingWait({ 
  className, 
  size = 20 
}: { 
  className?: string; 
  size?: number 
}) {
  return (
    <HourglassIcon 
      className={cn("text-amber-500", className)} 
      size={size}
    />
  );
}

// Unified loading icon component based on type
export function LoadingIcon({ 
  type = "loading",
  className,
  size = 20
}: { 
  type?: LoadingType;
  className?: string;
  size?: number;
}) {
  switch (type) {
    case "sending":
      return <LoadingSend className={className} size={size} />;
    case "processing":
      return <LoadingProcessing className={className} size={size} />;
    case "waiting":
      return <LoadingWait className={className} size={size} />;
    case "loading":
    default:
      return <SpinnerIcon className={className} size={size} />;
  }
}

// Button loading component with icon and text
export function ButtonLoading({ 
  type = "loading", 
  text,
  className,
  iconSize = 18
}: { 
  type?: LoadingType;
  text?: string;
  className?: string;
  iconSize?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LoadingIcon type={type} size={iconSize} />
      {text && <span>{text}</span>}
    </span>
  );
}
