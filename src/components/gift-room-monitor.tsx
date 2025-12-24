"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";

interface GiftRoomStats {
  platform: {
    rooms: {
      total: number;
      active: number;
      full: number;
      expired: number;
      completed: number;
    };
    reservations: {
      total: number;
      active: number;
      claimed: number;
      expired: number;
    };
    financial: {
      totalGiftValue: number;
      claimedValue: number;
      referralBonuses: number;
    };
    engagement: {
      averageJoinRate: number;
      averageClaimRate: number;
    };
    types: {
      personal: number;
      group: number;
      public: number;
    };
  };
  timestamp: string;
}

export function GiftRoomMonitor() {
  const [stats, setStats] = useState<GiftRoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/gift-rooms/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/gift-rooms/cleanup', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        // Reload stats after cleanup
        await loadStats();
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading statistics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load statistics</p>
          <Button onClick={loadStats} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gift Room Monitor</h2>
          <p className="text-muted-foreground">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStats} variant="outline" size="sm">
            <IonIcon name="refresh" size="16px" className="mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={runCleanup} 
            disabled={cleanupLoading}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {cleanupLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cleaning...
              </div>
            ) : (
              <>
                <IonIcon name="trash" size="16px" className="mr-1" />
                Run Cleanup
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Room Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {stats.platform.rooms.total}
            </div>
            <div className="text-sm text-muted-foreground">Total Rooms</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {stats.platform.rooms.active}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {stats.platform.rooms.full}
            </div>
            <div className="text-sm text-muted-foreground">Full</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">
              {stats.platform.rooms.expired}
            </div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {stats.platform.rooms.completed}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="cash" size="20px" color="#22c55e" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Gift Value</span>
              <span className="font-bold text-foreground">
                ₦{stats.platform.financial.totalGiftValue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Claimed Value</span>
              <span className="font-bold text-green-500">
                ₦{stats.platform.financial.claimedValue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Referral Bonuses</span>
              <span className="font-bold text-blue-500">
                ₦{stats.platform.financial.referralBonuses.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="people" size="20px" color="#3b82f6" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Join Rate</span>
              <span className="font-bold text-foreground">
                {(stats.platform.engagement.averageJoinRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Claim Rate</span>
              <span className="font-bold text-green-500">
                {(stats.platform.engagement.averageClaimRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Reservations</span>
              <span className="font-bold text-foreground">
                {stats.platform.reservations.total}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="pie-chart" size="20px" color="#8b5cf6" />
              Room Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Personal</span>
              <span className="font-bold text-foreground">
                {stats.platform.types.personal}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Group</span>
              <span className="font-bold text-foreground">
                {stats.platform.types.group}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Public</span>
              <span className="font-bold text-foreground">
                {stats.platform.types.public}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IonIcon name="bookmark" size="20px" color="#f59e0b" />
            Reservation Status
          </CardTitle>
          <CardDescription>
            Current status of all gift room reservations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">
                {stats.platform.reservations.active}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {stats.platform.reservations.claimed}
              </div>
              <div className="text-sm text-muted-foreground">Claimed</div>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-500">
                {stats.platform.reservations.expired}
              </div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}