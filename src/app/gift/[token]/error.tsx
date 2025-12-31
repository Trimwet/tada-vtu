"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { AnimatedBackground } from "@/components/animated-background";

export default function GiftRoomError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Gift Room Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <AnimatedBackground />
            <div className="relative z-10 text-center space-y-6 max-w-md bg-card/80 backdrop-blur-xl p-8 rounded-2xl border border-border shadow-2xl">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                    <IonIcon name="alert-circle" size="40px" color="#ef4444" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Gift Room Unavaiable</h1>
                    <p className="text-muted-foreground">
                        We couldn't load this gift room. It might have expired or been removed.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    >
                        <IonIcon name="refresh" size="18px" className="mr-2" />
                        Try Again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = "/dashboard"}
                    >
                        <IonIcon name="home" size="18px" className="mr-2" />
                        Go Dashboard
                    </Button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-muted rounded-lg text-left overflow-auto max-h-40 text-xs text-muted-foreground">
                        {error.message}
                    </div>
                )}
            </div>
        </div>
    );
}
