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

export default function ReferralsPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 lg:hidden gap-2"
        >
          <IonIcon name="arrow-back" size="16px" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Referral Program
          </h1>
          <p className="text-muted-foreground">
            Invite friends and earn rewards
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="border-border">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="gift-outline" size="40px" className="text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl text-foreground">Coming Soon</CardTitle>
            <CardDescription className="text-base">
              We&apos;re working on something exciting!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6 pt-4">
            <p className="text-muted-foreground max-w-md mx-auto">
              Our referral program is being redesigned to bring you better rewards and a more sustainable experience. Stay tuned for updates!
            </p>

            {/* What to expect */}
            <div className="bg-muted/50 rounded-xl p-6 text-left">
              <p className="font-medium text-foreground mb-4 flex items-center gap-2">
                <IonIcon name="sparkles-outline" size="18px" color="#22c55e" />
                What to expect
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <IonIcon name="checkmark-circle" size="18px" color="#22c55e" className="mt-0.5 shrink-0" />
                  <span>Competitive referral bonuses</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <IonIcon name="checkmark-circle" size="18px" color="#22c55e" className="mt-0.5 shrink-0" />
                  <span>Tiered rewards for top referrers</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <IonIcon name="checkmark-circle" size="18px" color="#22c55e" className="mt-0.5 shrink-0" />
                  <span>Easy sharing tools</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <IonIcon name="checkmark-circle" size="18px" color="#22c55e" className="mt-0.5 shrink-0" />
                  <span>Real-time tracking dashboard</span>
                </li>
              </ul>
            </div>

            <Button
              asChild
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Link href="/dashboard">
                <IonIcon name="arrow-back" size="16px" className="mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
