"use client";

import { IonIcon } from "@/components/ion-icon";
import { OCCASION_CONFIG } from "@/lib/gift-cards";
import type { GiftOccasion } from "@/types/database";

interface GiftLivePreviewProps {
  occasion: GiftOccasion | null;
  themeId: string;
  amount: string;
  senderName: string;
  recipientEmail: string;
  personalMessage: string;
}

export function GiftLivePreview({
  occasion,
  themeId,
  amount,
  senderName,
  recipientEmail,
  personalMessage
}: GiftLivePreviewProps) {
  if (!occasion || !amount) {
    return (
      <div className="bg-muted/30 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <IonIcon name="gift-outline" size="32px" className="text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Preview will appear here</p>
      </div>
    );
  }

  const config = OCCASION_CONFIG[occasion];
  const occasionColor = config?.color || "#22c55e";
  const numAmount = parseInt(amount) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <IonIcon name="eye-outline" size="16px" className="text-green-500" />
        Live Preview
      </div>
      
      {/* Gift Card Preview */}
      <div 
        className="relative rounded-3xl p-6 overflow-hidden border-2 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${occasionColor}15, ${occasionColor}05)`,
          borderColor: `${occasionColor}30`,
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2" 
               style={{ backgroundColor: occasionColor }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-1/2 -translate-x-1/2" 
               style={{ backgroundColor: occasionColor }} />
        </div>

        <div className="relative z-10 text-center space-y-4">
          {/* Gift Icon */}
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl"
            style={{ backgroundColor: `${occasionColor}20` }}
          >
            <IonIcon 
              name={config?.icon || "gift"} 
              size="40px" 
              color={occasionColor} 
            />
          </div>

          {/* Amount */}
          <div>
            <p className="text-3xl font-black text-foreground">
              ₦{numAmount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {config?.label} Gift Card
            </p>
          </div>

          {/* Sender Info */}
          <div className="bg-card/50 backdrop-blur rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-semibold text-foreground">{senderName || "Someone special"}</p>
          </div>

          {/* Personal Message */}
          {personalMessage && (
            <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-border text-left">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <IonIcon name="chatbubble-ellipses" size="12px" />
                Personal Message
              </p>
              <p className="text-sm text-foreground italic">
                "{personalMessage}"
              </p>
            </div>
          )}

          {/* Recipient */}
          {recipientEmail && (
            <div className="text-xs text-muted-foreground">
              To: {recipientEmail}
            </div>
          )}

          {/* Action Button Preview */}
          <div 
            className="w-full py-3 rounded-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: occasionColor }}
          >
            Open Gift 🎁
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <p className="text-xs text-muted-foreground text-center">
        This is how your gift will appear to the recipient
      </p>
    </div>
  );
}