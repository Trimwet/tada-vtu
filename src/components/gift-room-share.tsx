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
import { Input } from "@/components/ui/input";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";
import { GiftRoom, formatGiftRoomUrl, getGiftRoomTypeLabel } from "@/types/gift-room";

interface GiftRoomShareProps {
  room: GiftRoom;
  onClose?: () => void;
  className?: string;
}

export function GiftRoomShare({ room, onClose, className = "" }: GiftRoomShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = formatGiftRoomUrl(room.token);

  const shareMessage = room.message
    ? `🎁 I sent you a gift: "${room.message}" - Click to claim: ${shareUrl}`
    : `🎁 I sent you a gift! Click to claim: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!", { description: "Share this link to send your gift" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link", "Please copy manually");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success("Message copied!", { description: "Ready to share on WhatsApp or SMS" });
    } catch (error) {
      toast.error("Failed to copy message", "Please copy manually");
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSMSShare = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(smsUrl, '_blank');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TADA VTU Gift',
          text: room.message || 'I sent you a gift!',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to copy
      handleCopyMessage();
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="share-social" size="20px" color="#22c55e" />
              Share Your Gift
            </CardTitle>
            <CardDescription>
              {getGiftRoomTypeLabel(room.type)} • ₦{room.amount.toLocaleString()} each
            </CardDescription>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <IonIcon name="close" size="18px" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Gift Preview */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <IonIcon name="gift" size="24px" color="#22c55e" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                ₦{room.amount.toLocaleString()} Gift
              </p>
              <p className="text-sm text-muted-foreground">
                {room.capacity} {room.capacity === 1 ? 'recipient' : 'recipients'}
              </p>
            </div>
          </div>

          {room.message && (
            <div className="bg-background/80 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground italic">
                "{room.message}"
              </p>
            </div>
          )}
        </div>

        {/* Share Link */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Gift Link</h4>
            <span className="text-xs text-muted-foreground">
              {room.joined_count}/{room.capacity} joined
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="shrink-0"
            >
              <IonIcon
                name={copied ? "checkmark" : "copy"}
                size="16px"
                className="mr-1"
              />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Quick Share Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Quick Share</h4>

          <div className="grid grid-cols-2 gap-3">
            {/* WhatsApp */}
            <Button
              onClick={handleWhatsAppShare}
              variant="outline"
              className="h-12 border-green-500/30 hover:bg-green-500/10"
            >
              <div className="flex flex-col items-center gap-1">
                <IonIcon name="logo-whatsapp" size="20px" color="#25D366" />
                <span className="text-xs">WhatsApp</span>
              </div>
            </Button>

            {/* SMS */}
            <Button
              onClick={handleSMSShare}
              variant="outline"
              className="h-12 border-zinc-500/30 hover:bg-zinc-500/10"
            >
              <div className="flex flex-col items-center gap-1">
                <IonIcon name="chatbubble" size="20px" className="text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs">SMS</span>
              </div>
            </Button>
          </div>

          {/* Web Share API or Copy Message */}
          <Button
            onClick={handleWebShare}
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
          >
            <IonIcon name="share" size="20px" className="mr-2" />
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? "Share Gift" : "Copy Message"}
          </Button>
        </div>

        {/* Share Message Preview */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Message Preview</h4>

          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {shareMessage}
            </p>
          </div>

          <Button
            onClick={handleCopyMessage}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <IonIcon name="copy" size="16px" className="mr-2" />
            Copy Full Message
          </Button>
        </div>

        {/* Tips */}
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <IonIcon name="bulb" size="20px" className="shrink-0 mt-0.5 text-green-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-2">Sharing Tips</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Recipients can secure their spot before signing up</li>
                <li>• Share on WhatsApp for best results in Nigeria</li>
                <li>• You earn ₦100 for each new user who signs up</li>
                <li>• Unclaimed gifts are refunded when expired</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}