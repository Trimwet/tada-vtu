"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";

export default function BettingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
              Betting Wallet
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <IonIcon name="football" size="24px" color="#f97316" />
              </div>
              <div>
                <CardTitle className="text-xl">Fund Betting Wallet</CardTitle>
                <CardDescription>
                  Top up your betting account instantly
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Coming Soon Banner */}
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6">
                <IonIcon name="construct" size="48px" color="#f97316" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Coming Soon!
              </h2>
              
              <p className="text-muted-foreground max-w-md mb-6">
                We&apos;re working hard to bring you betting wallet funding for all major platforms. 
                Stay tuned for updates!
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['Bet9ja', 'SportyBet', 'BetKing', '1xBet', 'NairaBet', 'MSport'].map((platform) => (
                  <span
                    key={platform}
                    className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <Link href="/dashboard">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <IonIcon name="arrow-back-outline" size="18px" className="mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notify Me Card */}
        <Card className="border-border bg-orange-500/5 border-orange-500/20 mt-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <IonIcon
                name="notifications"
                size="20px"
                color="#f97316"
                className="shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Get Notified</p>
                <p className="text-muted-foreground">
                  Follow us on social media or contact support to be notified when this feature launches.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
