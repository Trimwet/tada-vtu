"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { GiftRoom } from "@/types/gift-room";

interface GiftRoomStatsProps {
  room: GiftRoom;
  className?: string;
}

export function GiftRoomStats({ room, className = "" }: GiftRoomStatsProps) {
  const spotsRemaining = room.capacity - room.joined_count;
  const claimRate = room.joined_count > 0 ? (room.claimed_count / room.joined_count) * 100 : 0;
  const totalValue = room.capacity * room.amount;
  const claimedValue = room.claimed_count * room.amount;
  const remainingValue = totalValue - claimedValue;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <IonIcon name="analytics" size="18px" color="#22c55e" />
          Room Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Joined</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{room.joined_count}</span>
              <span className="text-xs text-muted-foreground">/ {room.capacity}</span>
            </div>
          </div>
          <div className="flex-1 text-right space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining</p>
            <span className="text-2xl font-bold text-green-500">{spotsRemaining}</span>
          </div>
        </div>

        {/* Claim Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Claims</span>
            <span className="font-semibold text-foreground">
              {room.claimed_count} / {room.joined_count}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Claim Rate</span>
            <span className="font-semibold text-foreground">
              {claimRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Value Stats - Simplified List */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <IonIcon name="wallet-outline" size="14px" className="text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Value</span>
            </div>
            <span className="text-sm font-bold text-foreground">₦{totalValue.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <IonIcon name="checkmark-outline" size="14px" className="text-green-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Claimed</span>
            </div>
            <span className="text-sm font-bold text-green-500">₦{claimedValue.toLocaleString()}</span>
          </div>

          {remainingValue > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <IonIcon name="hourglass-outline" size="14px" className="text-amber-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">To Claim</span>
              </div>
              <span className="text-sm font-bold text-foreground">₦{remainingValue.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Claim Info Row */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Claim Rate</span>
            <span className="text-sm font-bold text-foreground">{claimRate.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Claims</span>
            <span className="text-sm font-bold text-foreground">{room.claimed_count} / {room.joined_count}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {room.joined_count} / {room.capacity}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(room.joined_count / room.capacity) * 100}%` }}
            />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${room.status === 'active' ? 'bg-green-500' :
              room.status === 'full' ? 'bg-zinc-500' :
                room.status === 'expired' ? 'bg-red-500' :
                  'bg-muted-foreground'
              }`} />
            <span className="text-sm font-medium text-foreground capitalize">
              {room.status}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}