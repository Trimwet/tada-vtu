"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { GiftRoomActivity, ActivityType } from "@/types/gift-room";

interface GiftRoomActivityFeedProps {
  roomId: string;
  className?: string;
}

interface ActivityWithUser extends GiftRoomActivity {
  user?: {
    full_name: string;
    referral_code: string;
  };
}

export function GiftRoomActivityFeed({ roomId, className = "" }: GiftRoomActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [roomId]);

  const loadActivities = async () => {
    try {
      // This would be an API call to get activities for the room
      // For now, we'll simulate with empty data
      setActivities([]);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityType): string => {
    switch (type) {
      case 'created':
        return 'add-circle';
      case 'joined':
        return 'person-add';
      case 'claimed':
        return 'gift';
      case 'expired':
        return 'time';
      case 'refunded':
        return 'arrow-undo';
      default:
        return 'ellipse';
    }
  };

  const getActivityColor = (type: ActivityType): string => {
    switch (type) {
      case 'created':
        return '#22c55e';
      case 'joined':
        return '#3b82f6';
      case 'claimed':
        return '#8b5cf6';
      case 'expired':
        return '#ef4444';
      case 'refunded':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getActivityMessage = (activity: ActivityWithUser): string => {
    const userName = activity.user?.full_name || 'Someone';
    
    switch (activity.activity_type) {
      case 'created':
        return `Gift room created`;
      case 'joined':
        return `${userName} joined the room`;
      case 'claimed':
        const amount = activity.details?.amount;
        return `${userName} claimed ${amount ? `₦${amount.toLocaleString()}` : 'their gift'}`;
      case 'expired':
        const refundAmount = activity.details?.refund_amount;
        return `Room expired${refundAmount ? ` • ₦${refundAmount.toLocaleString()} refunded` : ''}`;
      case 'refunded':
        const refund = activity.details?.refund_amount;
        return `Refund processed${refund ? ` • ₦${refund.toLocaleString()}` : ''}`;
      default:
        return 'Activity occurred';
    }
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IonIcon name="pulse" size="20px" color="#22c55e" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-muted-foreground">Loading activities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="pulse" size="20px" color="#22c55e" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time updates for this gift room
            </CardDescription>
          </div>
          <Button
            onClick={loadActivities}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <IonIcon name="refresh" size="16px" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="pulse-outline" size="32px" className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activities will appear here as people interact with your gift room
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-3">
                {/* Activity Icon */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${getActivityColor(activity.activity_type)}20` }}
                >
                  <IonIcon 
                    name={getActivityIcon(activity.activity_type)} 
                    size="16px" 
                    color={getActivityColor(activity.activity_type)}
                  />
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(activity.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">
                        {activity.activity_type === 'claimed' && (activity.details as any).referral_bonus_awarded && (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <IonIcon name="gift" size="12px" />
                            Referral bonus earned
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline Line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-7 mt-8 w-px h-6 bg-border" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified version for dashboard widgets
export function GiftRoomActivityWidget({ 
  activities, 
  className = "" 
}: { 
  activities: ActivityWithUser[];
  className?: string;
}) {
  const getActivityIcon = (type: ActivityType): string => {
    switch (type) {
      case 'created': return 'add-circle';
      case 'joined': return 'person-add';
      case 'claimed': return 'gift';
      case 'expired': return 'time';
      case 'refunded': return 'arrow-undo';
      default: return 'ellipse';
    }
  };

  const getActivityColor = (type: ActivityType): string => {
    switch (type) {
      case 'created': return '#22c55e';
      case 'joined': return '#3b82f6';
      case 'claimed': return '#8b5cf6';
      case 'expired': return '#ef4444';
      case 'refunded': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.slice(0, 5).map((activity) => (
        <div key={activity.id} className="flex items-center gap-3">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${getActivityColor(activity.activity_type)}20` }}
          >
            <IonIcon 
              name={getActivityIcon(activity.activity_type)} 
              size="12px" 
              color={getActivityColor(activity.activity_type)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">
              {activity.activity_type === 'joined' && 'Someone joined'}
              {activity.activity_type === 'claimed' && 'Gift claimed'}
              {activity.activity_type === 'created' && 'Room created'}
              {activity.activity_type === 'expired' && 'Room expired'}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(activity.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}