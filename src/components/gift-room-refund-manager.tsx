"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { giftRoomService } from "@/lib/gift-room-service";
import { toast } from "@/lib/toast";

interface RefundInfo {
  room_id: string;
  status: string;
  total_capacity: number;
  claimed_count: number;
  unclaimed_count: number;
  amount_per_gift: number;
  potential_refund_amount: number;
  can_refund: boolean;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

interface GiftRoomRefundManagerProps {
  roomId: string;
  onRefundComplete?: (refundAmount: number) => void;
  className?: string;
}

export function GiftRoomRefundManager({ 
  roomId, 
  onRefundComplete, 
  className = "" 
}: GiftRoomRefundManagerProps) {
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRefundInfo();
  }, [roomId]);

  const loadRefundInfo = async () => {
    try {
      setLoading(true);
      
      // First validate if user is the creator
      const ownershipResult = await giftRoomService.validateCreatorOwnership(roomId);
      
      if (!ownershipResult.success) {
        console.error('Failed to validate ownership:', ownershipResult.error);
        return;
      }

      setIsCreator(ownershipResult.isCreator);

      // Only load refund info if user is the creator
      if (ownershipResult.isCreator) {
        const result = await giftRoomService.getRefundInfo(roomId);
        
        if (result.success && result.data) {
          setRefundInfo(result.data);
        } else {
          console.error('Failed to load refund info:', result.error);
        }
      }
    } catch (error) {
      console.error('Error loading refund info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundInfo || !refundInfo.can_refund) return;

    try {
      setProcessing(true);
      
      const result = await giftRoomService.requestRefund(roomId);
      
      if (result.success && result.data) {
        toast.success("Refund Processed!", {
          description: result.data.message
        });
        
        // Update refund info to reflect the change
        setRefundInfo(prev => prev ? {
          ...prev,
          status: 'expired',
          can_refund: false,
          potential_refund_amount: 0
        } : null);
        
        // Notify parent component
        onRefundComplete?.(result.data.refund_amount);
      } else {
        toast.error("Refund Failed", result.error || "Unable to process refund");
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error("Error", "Something went wrong while processing the refund");
    } finally {
      setProcessing(false);
    }
  };

  // Don't render anything if user is not the creator
  if (!isCreator) {
    return null;
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            <span className="ml-2 text-muted-foreground">Loading refund information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!refundInfo) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'completed': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'expired': return 'time-outline';
      case 'completed': return 'checkmark-done';
      default: return 'help-circle';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IonIcon name="wallet" size="20px" color="#22c55e" />
          Refund Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <IonIcon 
                name={getStatusIcon(refundInfo.status)} 
                size="16px" 
                className={getStatusColor(refundInfo.status)}
              />
              <span className={`font-medium capitalize ${getStatusColor(refundInfo.status)}`}>
                {refundInfo.status}
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Claims Progress</p>
            <p className="font-medium">
              {refundInfo.claimed_count} / {refundInfo.total_capacity}
            </p>
          </div>
        </div>

        {/* Refund Details */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Unclaimed Gifts</span>
            <span className="font-medium">{refundInfo.unclaimed_count}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount per Gift</span>
            <span className="font-medium">₦{refundInfo.amount_per_gift.toLocaleString()}</span>
          </div>
          
          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Potential Refund</span>
              <span className={`font-bold text-lg ${
                refundInfo.potential_refund_amount > 0 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                ₦{refundInfo.potential_refund_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Expiration Info */}
        {refundInfo.status === 'active' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IonIcon name="time-outline" size="16px" />
            <span>
              {refundInfo.is_expired 
                ? 'Expired - automatic refund will be processed'
                : `Expires: ${new Date(refundInfo.expires_at).toLocaleDateString()}`
              }
            </span>
          </div>
        )}

        {/* Refund Action */}
        {refundInfo.can_refund && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <IonIcon name="information-circle" size="16px" color="#3b82f6" className="mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Manual Refund Available</p>
                  <p className="text-blue-700 mt-1">
                    You can request an immediate refund for unclaimed gifts. This will expire the gift room.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRefund}
              disabled={processing}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Refund...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <IonIcon name="arrow-back" size="16px" />
                  Request Refund (₦{refundInfo.potential_refund_amount.toLocaleString()})
                </div>
              )}
            </Button>
          </div>
        )}

        {/* No Refund Available */}
        {!refundInfo.can_refund && refundInfo.status === 'active' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <IonIcon name="checkmark-circle" size="16px" color="#10b981" />
              <span className="text-sm text-gray-700">
                All gifts have been claimed. No refund available.
              </span>
            </div>
          </div>
        )}

        {/* Already Processed */}
        {refundInfo.status === 'expired' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <IonIcon name="checkmark-done" size="16px" color="#10b981" />
              <span className="text-sm text-green-700">
                Refund has been processed for unclaimed gifts.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}