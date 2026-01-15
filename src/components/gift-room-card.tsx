"use client";

import { useState, useEffect } from "react";
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
  // Hydration fix: Move time-dependent calculations to useEffect
  const [isMounted, setIsMounted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [createdDate, setCreatedDate] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setIsExpired(isGiftRoomExpired(room.expires_at));
    setTimeLeft(getTimeUntilExpiration(room.expires_at));
    setCreatedDate(new Date(room.created_at).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [room.expires_at, room.created_at]);

  const shareUrl = formatGiftRoomUrl(room.token);
  const spotsRemaining = room.capacity - room.joined_count;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'full':
        return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
      case 'expired':
        return 'text-muted-foreground bg-muted/30 border-border/50';
      case 'completed':
        return 'text-muted-foreground bg-muted/30 border-border/50';
      default:
        return 'text-muted-foreground bg-muted border-border/50';
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

        {/* Gift Amount - Clean and Bold */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <div className="text-3xl font-bold text-foreground">
            ₦{room.amount.toLocaleString()}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            per person
          </p>
        </div>

        {/* Message Preview - Simplified */}
        {room.message && (
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground line-clamp-2 px-2">
              <span className="text-green-500/50 mr-1">"</span>
              {room.message}
              <span className="text-green-500/50 ml-1">"</span>
            </p>
          </div>
        )}

        {/* Stats & Time - Single Line Info */}
        <div className="flex items-center justify-between py-3 border-t border-border/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground font-medium">Joined</span>
              <span className="text-sm font-semibold text-foreground">{room.joined_count}/{room.capacity}</span>
            </div>
            <div className="w-px h-6 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground font-medium">Claimed</span>
              <span className="text-sm font-semibold text-foreground">{room.claimed_count}</span>
            </div>
          </div>

          {isMounted && !isExpired && (
            <div className="flex items-center gap-1 text-green-500 bg-green-500/5 px-2 py-1 rounded">
              <IonIcon name="time-outline" size="12px" />
              <span className="text-[10px] font-bold whitespace-nowrap">
                {timeLeft.split(' ')[0]} LEFT
              </span>
            </div>
          )}
        </div>

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
            {isMounted && `Created ${createdDate}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}