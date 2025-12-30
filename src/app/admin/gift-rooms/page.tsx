"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { getSupabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const GiftRoomSystemStatus = dynamic(
  () => import('@/components/gift-room-system-status').then(mod => mod.GiftRoomSystemStatus),
  { ssr: false }
);
import Link from "next/link";
import { toast } from "@/lib/toast";

export default function AdminGiftRoomsPage() {
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const runCleanup = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/gift-rooms/cleanup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Cleanup completed", {
          description: `Processed ${data.data?.expired_rooms_processed || 0} expired rooms`
        });
      } else {
        toast.error("Cleanup failed", data.error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error("Cleanup failed", "Network error occurred");
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Link href="/admin" className="p-2 -ml-2 hover:bg-muted rounded-lg">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">Gift Room System</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={runCleanup}
              disabled={cleanupLoading}
              variant="outline"
              size="sm"
            >
              {cleanupLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <IonIcon name="trash" size="16px" className="mr-2" />
              )}
              Run Cleanup
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-6xl">
        {/* Admin Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>
              Administrative tools for managing the gift room system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={runCleanup}
                disabled={cleanupLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {cleanupLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IonIcon name="trash" size="16px" />
                )}
                Run Manual Cleanup
              </Button>

              <Link href="/api/gift-rooms/health" target="_blank">
                <Button variant="outline" className="flex items-center gap-2">
                  <IonIcon name="analytics" size="16px" />
                  View Raw Health Data
                </Button>
              </Link>

              <Link href="/admin/analytics">
                <Button variant="outline" className="flex items-center gap-2">
                  <IonIcon name="bar-chart" size="16px" />
                  System Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <GiftRoomSystemStatus />

        {/* Quick Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Key information about the gift room system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3">Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Personal, Group & Public Gift Rooms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Device Fingerprinting & Reservations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Automatic Wallet Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Referral Bonus System</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Expiration & Cleanup Services</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle" size="16px" color="#22c55e" />
                    <span>Fraud Prevention & Security</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">API Endpoints</h4>
                <ul className="space-y-1 text-sm font-mono">
                  <li className="text-muted-foreground">POST /api/gift-rooms/create</li>
                  <li className="text-muted-foreground">GET /api/gift-rooms/[token]</li>
                  <li className="text-muted-foreground">POST /api/gift-rooms/join</li>
                  <li className="text-muted-foreground">POST /api/gift-rooms/claim</li>
                  <li className="text-muted-foreground">GET /api/gift-rooms/history</li>
                  <li className="text-muted-foreground">GET /api/gift-rooms/stats</li>
                  <li className="text-muted-foreground">POST /api/gift-rooms/cleanup</li>
                  <li className="text-muted-foreground">GET /api/gift-rooms/health</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}