"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IonIcon } from "@/components/ion-icon";
import {
  OCCASION_CONFIG,
  GIFT_AMOUNTS,
  getThemesByOccasion,
  type GiftTheme,
} from "@/lib/gift-cards";
import type { GiftOccasion } from "@/types/database";

interface GiftCardCreatorProps {
  onSend: (gift: {
    recipient_email: string;
    recipient_phone: string;
    service_type: "airtime" | "data";
    amount: number;
    occasion: GiftOccasion;
    theme_id: string;
    personal_message?: string;
    scheduled_delivery?: string;
  }) => Promise<{ success: boolean; giftId?: string; shareLink?: string; error?: string }>;
  userBalance: number;
  onClose: () => void;
}

type Step = "occasion" | "amount" | "recipient" | "message" | "preview";

export function GiftCardCreator({ onSend, userBalance, onClose }: GiftCardCreatorProps) {
  const [step, setStep] = useState<Step>("occasion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [giftId, setGiftId] = useState<string | null>(null);

  // Form state
  const [occasion, setOccasion] = useState<GiftOccasion | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<GiftTheme | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  const occasions = Object.entries(OCCASION_CONFIG) as [GiftOccasion, { label: string; icon: string; color: string }][];

  const handleOccasionSelect = (occ: GiftOccasion) => {
    setOccasion(occ);
    const themes = getThemesByOccasion(occ);
    if (themes.length > 0) {
      setSelectedTheme(themes[0]);
    }
    setStep("amount");
  };

  const handleAmountSelect = (amt: number) => {
    setAmount(amt);
    setCustomAmount("");
    setStep("recipient");
  };

  const handleCustomAmount = () => {
    const amt = parseInt(customAmount);
    if (amt >= 100 && amt <= 50000) {
      setAmount(amt);
      setStep("recipient");
    } else {
      setError("Amount must be between ₦100 and ₦50,000");
    }
  };

  const handleRecipientNext = () => {
    // Validate email (required)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    // Validate phone (required for airtime delivery)
    if (!recipientPhone) {
      setError("Phone number is required for airtime delivery");
      return;
    }
    if (!/^0[789][01]\d{8}$/.test(recipientPhone)) {
      setError("Invalid phone number. Use format: 08012345678");
      return;
    }
    if (amount > userBalance) {
      setError(`Insufficient balance. You have ₦${userBalance.toLocaleString()}`);
      return;
    }
    setError("");
    setStep("message");
  };

  const handleSend = async () => {
    if (!occasion || !selectedTheme || !amount || !recipientPhone) return;

    setLoading(true);
    setError("");

    try {
      const result = await onSend({
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        service_type: "airtime",
        amount,
        occasion,
        theme_id: selectedTheme.id,
        personal_message: personalMessage || undefined,
        scheduled_delivery: scheduleDelivery && scheduledDate ? scheduledDate : undefined,
      });

      if (result.success) {
        setGiftId(result.giftId || null);
        setStep("preview");
      } else {
        setError(result.error || "Failed to send gift");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "occasion":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              What&apos;s the occasion?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {occasions.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleOccasionSelect(key)}
                  className="p-4 rounded-xl border border-border hover:border-green-500 hover:bg-green-500/5 transition-all text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <IonIcon name={config.icon} size="24px" color={config.color} />
                  </div>
                  <p className="text-sm font-medium text-foreground mt-2">
                    {config.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case "amount":
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep("occasion")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <IonIcon name="arrow-back" size="16px" />
              Back
            </button>

            <div className="text-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${selectedTheme?.primaryColor}20` }}
              >
                <IonIcon name={selectedTheme?.icon || "gift"} size="32px" color={selectedTheme?.primaryColor} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {occasion && OCCASION_CONFIG[occasion]?.label}
              </p>
            </div>

            {/* Theme selector */}
            {occasion && getThemesByOccasion(occasion).length > 1 && (
              <div className="flex gap-2 justify-center mb-4">
                {getThemesByOccasion(occasion).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      selectedTheme?.id === theme.id
                        ? "ring-2 ring-green-500 bg-green-500/10"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <IonIcon name={theme.icon} size="24px" color={theme.primaryColor} />
                  </button>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              How much would you like to gift?
            </p>

            <div className="grid grid-cols-3 gap-2">
              {GIFT_AMOUNTS.map((amt) => (
                <button
                  key={amt.value}
                  onClick={() => handleAmountSelect(amt.value)}
                  disabled={amt.value > userBalance}
                  className={`p-3 rounded-xl border transition-all ${
                    amt.value > userBalance
                      ? "border-border opacity-50 cursor-not-allowed"
                      : "border-border hover:border-green-500 hover:bg-green-500/5"
                  }`}
                >
                  <p className="font-bold text-foreground">{amt.label}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCustomAmount}
                disabled={!customAmount}
                variant="outline"
              >
                Set
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your balance: ₦{userBalance.toLocaleString()}
            </p>
          </div>
        );

      case "recipient":
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep("amount")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <IonIcon name="arrow-back" size="16px" />
              Back
            </button>

            <div className="text-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${selectedTheme?.primaryColor}20` }}
              >
                <IonIcon name={selectedTheme?.icon || "gift"} size="32px" color={selectedTheme?.primaryColor} />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">
                ₦{amount.toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Recipient&apos;s Email Address
              </label>
              <Input
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1">
                Airtime will be sent to this number when recipient opens the gift
              </p>
              <Input
                type="tel"
                placeholder="08012345678"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="mt-1"
                maxLength={11}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              onClick={handleRecipientNext}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              Continue
            </Button>
          </div>
        );

      case "message":
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep("recipient")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <IonIcon name="arrow-back" size="16px" />
              Back
            </button>

            <div className="text-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${selectedTheme?.primaryColor}20` }}
              >
                <IonIcon name={selectedTheme?.icon || "gift"} size="32px" color={selectedTheme?.primaryColor} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ₦{amount.toLocaleString()} to {recipientEmail}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Personal Message (Optional)
              </label>
              <textarea
                placeholder={selectedTheme?.defaultMessage || "Write a heartfelt message..."}
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                className="mt-1 w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {personalMessage.length}/500
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule"
                checked={scheduleDelivery}
                onChange={(e) => setScheduleDelivery(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="schedule" className="text-sm text-foreground">
                Schedule for later
              </label>
            </div>

            {scheduleDelivery && (
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <IonIcon name="sync" size="18px" className="animate-spin" />
              ) : (
                <>
                  <IonIcon name="gift" size="18px" className="mr-2" />
                  Send Gift
                </>
              )}
            </Button>
          </div>
        );

      case "preview":
        const shareLink = giftId ? `https://tadavtu.com/gift/${giftId}` : "";
        return (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <IonIcon name="checkmark-circle" size="48px" color="#22c55e" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Gift Sent!</h3>
            <p className="text-muted-foreground">
              Your ₦{amount.toLocaleString()} gift has been sent to {recipientEmail}
            </p>
            
            {giftId && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Share this link with the recipient:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                    }}
                  >
                    <IonIcon name="copy" size="16px" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "You have a gift on TADA VTU!",
                        text: `Someone sent you a ₦${amount.toLocaleString()} gift! Open it now:`,
                        url: shareLink,
                      });
                    }
                  }}
                >
                  <IonIcon name="share-social" size="18px" className="mr-2" />
                  Share via WhatsApp/SMS
                </Button>
              </div>
            )}
            
            <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600">
              Done
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="border-border max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <IonIcon name="gift" size="20px" color="#22c55e" />
            Send a Gift
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <IonIcon name="close" size="20px" />
          </button>
        </div>
      </CardHeader>
      <CardContent>{renderStep()}</CardContent>
    </Card>
  );
}
