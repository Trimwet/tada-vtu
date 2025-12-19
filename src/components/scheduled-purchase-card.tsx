"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import type { ScheduledPurchase } from "@/types/database";
import {
  formatScheduleDescription,
  getScheduleStatusMessage,
  estimateMonthlyCost,
} from "@/lib/scheduled-purchases";

interface ScheduledPurchaseCardProps {
  schedule: ScheduledPurchase;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (schedule: ScheduledPurchase) => void;
}

export function ScheduledPurchaseCard({
  schedule,
  onPause,
  onResume,
  onDelete,
  onEdit,
}: ScheduledPurchaseCardProps) {
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const statusInfo = getScheduleStatusMessage(schedule.last_status);
  const monthlyCost = estimateMonthlyCost(schedule);
  const nextRun = new Date(schedule.next_run_at);
  const isOverdue = nextRun < new Date() && schedule.is_active;

  const handlePauseResume = async () => {
    setLoading(true);
    try {
      if (schedule.is_active) {
        await onPause(schedule.id);
      } else {
        await onResume(schedule.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    setLoading(true);
    try {
      await onDelete(schedule.id);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = () => {
    switch (schedule.service_type) {
      case "airtime":
        return "call";
      case "data":
        return "wifi";
      case "cable":
        return "tv";
      case "electricity":
        return "flash";
      default:
        return "card";
    }
  };

  return (
    <Card
      className={`border-border overflow-hidden transition-all ${
        !schedule.is_active ? "opacity-60" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <IonIcon name={getServiceIcon()} size="20px" color="#22c55e" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground capitalize">
                {schedule.service_type}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {schedule.recipient_phone || schedule.meter_number || schedule.smartcard_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!schedule.is_active && (
              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">
                Paused
              </span>
            )}
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <IonIcon name="ellipsis-vertical" size="18px" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Amount and Schedule */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              ₦{schedule.amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatScheduleDescription(schedule)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. Monthly</p>
            <p className="text-sm font-medium text-foreground">
              ₦{monthlyCost.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Next Run */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg ${
            isOverdue ? "bg-red-500/10" : "bg-muted/50"
          }`}
        >
          <IonIcon
            name={isOverdue ? "alert-circle" : "time-outline"}
            size="16px"
            color={isOverdue ? "#ef4444" : "#9ca3af"}
          />
          <span className={`text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
            {schedule.is_active
              ? `Next: ${nextRun.toLocaleDateString()} at ${nextRun.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : `Paused${schedule.pause_reason ? `: ${schedule.pause_reason}` : ""}`}
          </span>
        </div>

        {/* Status */}
        {schedule.last_status && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last run:</span>
            <span className={`text-${statusInfo.color}-500`}>{statusInfo.message}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>✓ {schedule.success_count} successful</span>
          <span>✗ {schedule.failure_count} failed</span>
          <span>₦{schedule.total_spent.toLocaleString()} total</span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              onClick={handlePauseResume}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <IonIcon
                name={schedule.is_active ? "pause" : "play"}
                size="14px"
                className="mr-1"
              />
              {schedule.is_active ? "Pause" : "Resume"}
            </Button>
            <Button
              onClick={() => onEdit(schedule)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <IonIcon name="pencil" size="14px" />
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:border-red-500"
            >
              <IonIcon name="trash" size="14px" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state
export function NoSchedulesCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-border border-dashed">
      <CardContent className="py-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <IonIcon name="calendar-outline" size="32px" className="text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No Scheduled Purchases</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set up automatic purchases for airtime, data, or bills
        </p>
        <Button onClick={onCreate} className="bg-green-500 hover:bg-green-600">
          <IonIcon name="add" size="18px" className="mr-1" />
          Create Schedule
        </Button>
      </CardContent>
    </Card>
  );
}
