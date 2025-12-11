"use client";

import { LogoInline } from "@/components/logo";

interface LoadingScreenProps {
  message?: string;
  variant?: "default" | "minimal" | "fullscreen";
}

export function LoadingScreen({ message = "Loading...", variant = "default" }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Logo with glow effect */}
        {variant !== "minimal" && (
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-green-500/20 rounded-full animate-pulse" />
            <LogoInline size="lg" showText={false} className="justify-center relative z-10" />
          </div>
        )}

        {/* Unique TADA Spinner */}
        <div className="relative w-16 h-16 mx-auto">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-green-500/20" />
          
          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}>
            <svg className="w-full h-full" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="url(#spinner-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="140 60"
              />
            </svg>
          </div>

          {/* Inner pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
          </div>

          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-400 rounded-full" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '-1s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-70" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '-2s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-300 rounded-full opacity-50" />
          </div>
        </div>

        {/* Animated text */}
        <div className="space-y-1">
          <p className="text-foreground font-medium text-sm">{message}</p>
          <div className="flex justify-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline spinner for buttons and small areas
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <svg className="w-full h-full animate-spin" style={{ animationDuration: '1s' }} viewBox="0 0 24 24">
        <defs>
          <linearGradient id="btn-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="url(#btn-spinner-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="50 20"
        />
      </svg>
    </div>
  );
}

// Card/Section loading skeleton
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
