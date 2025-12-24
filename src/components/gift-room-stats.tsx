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
        {/* Capacity Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-500">
              {room.joined_count}
            </div>
            <div className="text-sm text-muted-foreground">
              People Joined
            </div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">
              {spotsRemaining}
            </div>
            <div className="text-sm text-muted-foreground">
              Spots Left
            </div>
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

        {/* Value Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="font-semibold text-foreground">
              ₦{totalValue.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Claimed Value</span>
            <span className="font-semibold text-green-500">
              ₦{claimedValue.toLocaleString()}
            </span>
          </div>
          
          {remainingValue > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
              <span className="text-sm text-muted-foreground">Remaining Value</span>
              <span className="font-semibold text-amber-600">
                ₦{remainingValue.toLocaleString()}
              </span>
            </div>
          )}
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
            <div className={`w-2 h-2 rounded-full ${
              room.status === 'active' ? 'bg-green-500' :
              room.status === 'full' ? 'bg-blue-500' :
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