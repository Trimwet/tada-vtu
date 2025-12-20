"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";

interface ShareGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftId: string;
  recipientEmail: string;
  amount: number;
  occasion: string;
}

export function ShareGiftModal({
  isOpen,
  onClose,
  giftId,
  recipientEmail,
  amount,
  occasion
}: ShareGiftModalProps) {
  const [copying, setCopying] = useState(false);

  if (!isOpen) return null;

  const giftUrl = `${window.location.origin}/gift/${giftId}`;
  const shareText = `🎁 You've received a special gift! ₦${amount.toLocaleString()} airtime gift card for ${occasion}. Open it here: ${giftUrl}`;

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(giftUrl);
      toast.success("Link copied!", { description: "Gift link copied to clipboard" });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = giftUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success("Link copied!", { description: "Gift link copied to clipboard" });
    } finally {
      setCopying(false);
    }
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    window.open(smsUrl, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `🎁 You've received a gift card!`;
    const body = `Hi!\n\nYou've received a special ₦${amount.toLocaleString()} airtime gift card for ${occasion}.\n\nClick here to open your gift: ${giftUrl}\n\nEnjoy!\n\nSent via TADA VTU`;
    const emailUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-md shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <IonIcon name="share-social" size="24px" color="white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Share Gift</h2>
              <p className="text-sm text-muted-foreground">Send the gift link</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-muted rounded-xl"
          >
            <IonIcon name="close" size="24px" />
          </Button>
        </div>

        {/* Gift Preview */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-4 mb-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <IonIcon name="gift" size="20px" color="white" />
            </div>
            <div>
              <p className="font-bold text-green-700 dark:text-green-300">₦{amount.toLocaleString()}</p>
              <p className="text-sm text-green-600 dark:text-green-400 capitalize">{occasion} Gift</p>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Share via:</p>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white h-12"
            >
              <IonIcon name="logo-whatsapp" size="20px" />
              WhatsApp
            </Button>
            
            <Button
              onClick={handleShareSMS}
              variant="outline"
              className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 h-12"
            >
              <IonIcon name="chatbubble" size="20px" />
              SMS
            </Button>
            
            <Button
              onClick={handleShareEmail}
              variant="outline"
              className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 h-12"
            >
              <IonIcon name="mail" size="20px" />
              Email
            </Button>
            
            <Button
              onClick={handleCopyLink}
              disabled={copying}
              variant="outline"
              className="flex items-center gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 h-12"
            >
              {copying ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <IonIcon name="copy" size="20px" />
              )}
              Copy Link
            </Button>
          </div>
        </div>

        {/* Gift Link */}
        <div className="mt-6 p-3 bg-muted rounded-xl">
          <p className="text-xs text-muted-foreground mb-2">Gift Link:</p>
          <p className="text-sm font-mono text-foreground break-all">{giftUrl}</p>
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full mt-6 h-12"
        >
          Done
        </Button>
      </div>
    </div>
  );
}