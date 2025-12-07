"use client";

import { LogoInline } from "@/components/logo";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Logo */}
        <div className="animate-pulse">
          <LogoInline size="lg" showText={false} className="justify-center" />
        </div>

        {/* Simple spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Message */}
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
