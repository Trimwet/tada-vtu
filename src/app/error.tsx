"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <IonIcon name="alert-circle-outline" size="40px" color="#ef4444" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <IonIcon name="refresh-outline" size="18px" className="mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/dashboard"}
          >
            <IonIcon name="home-outline" size="18px" className="mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
