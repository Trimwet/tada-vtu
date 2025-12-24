"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { 
  GiftRoom, 
  getGiftRoomTypeLabel, 
  getGiftRoomStatusLabel,
  getTimeUntilExpiration,
  isGiftRoomExpired,
  formatGiftRoomUrl
} from "@/types/gift-room";

interface GiftRoomCardProps {
  room: GiftRoom;
  sender?: {
    full_name: string;
    referral_code: string;
  };
  onShare?: (shareUrl: string) => void;
  onView?: (token: string) => void;
  className?: string;
  showActions?: boolean;
}

export function GiftRoomCard({ 
  room, 
  sender, 
  onShare, 
  onView, 
  className = "",
  showActions = true 
}: GiftRoomCardProps) {
  const isExpired = isGiftRoomExpired(room.expires_at);
  const timeLeft = getTimeUntilExpiration(room.expires_at);
  const shareUrl = formatGiftRoomUrl(room.token);
  const spotsRemaining = room.capacity - room.joined_count;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-500/10';
      case 'full':
        return 'text-blue-500 bg-blue-500/10';
      case 'expired':
        return 'text-red-500 bg-red-500/10';
      case 'completed':
        return 'text-purple-500 bg-purple-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal':
        return 'person';
      case 'group':
        return 'people';
      case 'public':
        return 'megaphone';
      default:
        return 'gift';
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name={getTypeIcon(room.type)} size="16px" color="#22c55e" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {getGiftRoomTypeLabel(room.type)}
              </p>
              <p className="text-xs text-muted-foreground">
                {sender ? `From ${sender.full_name}` : 'Your gift room'}
              </p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
            {getGiftRoomStatusLabel(room.status)}
          </div>
        </div>

        {/* Gift Amount */}
        <div className="text-center py-3 mb-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-green-500">
            ₦{room.amount.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            per person
          </div>
        </div>

        {/* Message Preview */}
        {room.message && (
          <div className="mb-3 p-2 bg-background/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground italic line-clamp-2">
              "{room.message}"
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 bg-background/50 rounded-lg">
            <div className="text-sm font-bold text-foreground">
              {room.joined_count}
            </div>
            <div className="text-xs text-muted-foreground">
              Joined
            </div>
          </div>
          <div className="p-2 bg-background/50 rounded-lg">
            <div className="text-sm font-bold text-foreground">
              {room.claimed_count}
            </div>
            <div className="text-xs text-muted-foreground">
              Claimed
            </div>
          </div>
          <div className="p-2 bg-background/50 rounded-lg">
            <div className="text-sm font-bold text-foreground">
              {spotsRemaining}
            </div>
            <div className="text-xs text-muted-foreground">
              Left
            </div>
          </div>
        </div>

        {/* Time Left */}
        {!isExpired && (
          <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <IonIcon name="time" size="14px" color="#3b82f6" />
              <span className="text-xs font-medium text-blue-600">
                {timeLeft}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {onView && (
              <Button
                onClick={() => onView(room.token)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <IonIcon name="eye" size="16px" className="mr-1" />
                View
              </Button>
            )}
            {onShare && room.status === 'active' && (
              <Button
                onClick={() => onShare(shareUrl)}
                size="sm"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                <IonIcon name="share" size="16px" className="mr-1" />
                Share
              </Button>
            )}
          </div>
        )}

        {/* Created Date */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Created {new Date(room.created_at).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}