"use client";

import dynamic from "next/dynamic";
import { setWasmUrl } from "@lottiefiles/dotlottie-react";

// Point WASM at our public folder so it's cached by the browser after first load
if (typeof window !== "undefined") {
  setWasmUrl("/dotlottie-player.wasm");
}

// Worker-based renderer — runs off the main thread, no jank
const DotLottieWorkerReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieWorkerReact),
  {
    ssr: false,
    // Instant CSS ring shown while the JS chunk loads (~first visit only)
    loading: () => <CSSRing size={72} />,
  }
);

function CSSRing({ size = 72 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-[3px] border-green-500/20 border-t-green-500 animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <DotLottieWorkerReact
          src="/loading-circle.lottie"
          loop
          autoplay
          style={{ width: 96, height: 96 }}
        />
        {message && (
          <p className="text-muted-foreground text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}

// Small inline spinner (buttons, modals, etc.)
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = { sm: 24, md: 36, lg: 48 }[size];
  return (
    <DotLottieWorkerReact
      src="/loading-circle.lottie"
      loop
      autoplay
      style={{ width: px, height: px }}
    />
  );
}

// Skeleton rows for card/section loading
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
