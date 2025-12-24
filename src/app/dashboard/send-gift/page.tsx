"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { giftRoomService } from "@/lib/gift-room-service";
import { 
  GiftRoomType, 
  CreateGiftRoomRequest,
  GIFT_ROOM_LIMITS,
  validateGiftRoomCapacity,
  validateGiftAmount,
  calculateTotalAmount,
  getGiftRoomTypeLabel
} from "@/types/gift-room";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function SendGiftPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  
  const [giftType, setGiftType] = useState<GiftRoomType>('personal');
  const [capacity, setCapacity] = useState(1);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [expirationHours, setExpirationHours] = useState(48);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Update capacity when gift type changes
  useEffect(() => {
    const limits = GIFT_ROOM_LIMITS[giftType];
    setCapacity(limits.min);
  }, [giftType]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleCreateGift = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    const giftAmount = parseFloat(amount);
    
    // Validation
    if (!giftAmount || giftAmount < 50) {
      toast.error("Minimum gift amount is ₦50");
      return;
    }

    if (!validateGiftAmount(giftAmount)) {
      toast.error("Gift amount must be between ₦50 and ₦50,000");
      return;
    }

    if (!validateGiftRoomCapacity(giftType, capacity)) {
      const limits = GIFT_ROOM_LIMITS[giftType];
      toast.error(`Capacity must be between ${limits.min} and ${limits.max} for ${giftType} gifts`);
      return;
    }

    const totalAmount = calculateTotalAmount(capacity, giftAmount);
    if (user.balance < totalAmount) {
      toast.error("Insufficient balance", `You need ₦${totalAmount.toLocaleString()} but have ₦${user.balance.toLocaleString()}`);
      return;
    }

    if (message.length > 500) {
      toast.error("Message cannot exceed 500 characters");
      return;
    }

    setCreating(true);
    try {
      const request: CreateGiftRoomRequest = {
        type: giftType,
        capacity,
        amount: giftAmount,
        message: message.trim() || undefined,
        expiration_hours: expirationHours
      };

      const response = await giftRoomService.createGiftRoom(request);

      if (response.success && response.data) {
        setShareUrl(response.data.share_url);
        setShowSuccess(true);
        toast.success("Gift room created!", {
          description: `₦${totalAmount.toLocaleString()} deducted from your wallet`
        });
      } else {
        toast.error("Failed to create gift room", response.error);
      }
    } catch (error) {
      console.error("Error creating gift room:", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    const shareMessage = message 
      ? `I sent you a gift: "${message}"`
      : "I sent you a gift!";

    const success = await giftRoomService.shareGiftRoom(shareUrl.split('/').pop()!, shareMessage);
    if (success) {
      toast.success("Shared!", { description: "Gift link copied to clipboard" });
    } else {
      toast.error("Failed to share", "Please copy the link manually");
    }
  };

  const totalAmount = amount ? calculateTotalAmount(capacity, parseFloat(amount)) : 0;
  const canAfford = user ? user.balance >= totalAmount : false;

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
          <div className="flex items-center h-14 px-4">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Gift Created</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IonIcon name="checkmark-circle" size="40px" color="#22c55e" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Gift Room Created!
              </h2>
              <p className="text-muted-foreground mb-6">
                Your {getGiftRoomTypeLabel(giftType).toLowerCase()} is ready to share
              </p>

              <div className="bg-background/80 rounded-xl p-4 mb-6 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Gift Amount</span>
                  <span className="font-bold text-green-500">₦{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Recipients</span>
                  <span className="font-medium text-foreground">{capacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Deducted</span>
                  <span className="font-bold text-foreground">₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleShare}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  <IonIcon name="share" size="20px" className="mr-2" />
                  Share Gift Link
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuccess(false);
                      setAmount('');
                      setMessage('');
                      setShareUrl('');
                    }}
                    className="flex-1"
                  >
                    Create Another
                  </Button>
                  <Link href="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <IonIcon name="home" size="18px" className="mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <IonIcon name="information-circle" size="16px" className="inline mr-1" />
                  Recipients have {expirationHours} hours to claim their gifts
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Send Gift</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <IonIcon name="wallet" size="24px" color="white" />
              </div>
              <div>
                <p className="text-green-100 text-sm">Available Balance</p>
                <h2 className="text-2xl font-bold text-white">
                  ₦{(user?.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gift Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IonIcon name="gift" size="20px" color="#22c55e" />
              Gift Type
            </CardTitle>
            <CardDescription>Choose who can receive your gift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setGiftType('personal')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                giftType === 'personal'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border hover:border-green-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  giftType === 'personal' ? 'bg-green-500/20' : 'bg-muted'
                }`}>
                  <IonIcon name="person" size="20px" color={giftType === 'personal' ? '#22c55e' : '#888'} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Personal Gift</p>
                  <p className="text-sm text-muted-foreground">Send to one specific person</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setGiftType('group')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                giftType === 'group'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border hover:border-green-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  giftType === 'group' ? 'bg-green-500/20' : 'bg-muted'
                }`}>
                  <IonIcon name="people" size="20px" color={giftType === 'group' ? '#22c55e' : '#888'} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Group Gift</p>
                  <p className="text-sm text-muted-foreground">Send to 2-50 people you know</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setGiftType('public')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                giftType === 'public'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border hover:border-green-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  giftType === 'public' ? 'bg-green-500/20' : 'bg-muted'
                }`}>
                  <IonIcon name="megaphone" size="20px" color={giftType === 'public' ? '#22c55e' : '#888'} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Public Giveaway</p>
                  <p className="text-sm text-muted-foreground">Open to anyone with the link (up to 1000)</p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Capacity Selection */}
        {giftType !== 'personal' && (
          <Card>
            <CardHeader>
              <CardTitle>Number of Recipients</CardTitle>
              <CardDescription>
                How many people can claim this gift?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Recipients ({GIFT_ROOM_LIMITS[giftType].min}-{GIFT_ROOM_LIMITS[giftType].max})</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  min={GIFT_ROOM_LIMITS[giftType].min}
                  max={GIFT_ROOM_LIMITS[giftType].max}
                  className="h-12 text-lg font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Gift Amount</CardTitle>
            <CardDescription>Amount each recipient will receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleQuickAmount(value)}
                    className={`px-4 py-2 rounded-lg border transition-smooth text-sm font-medium ${
                      amount === value.toString()
                        ? "border-green-500 bg-green-500/10 text-green-500"
                        : "border-border hover:border-green-500/50 text-foreground"
                    }`}
                  >
                    ₦{value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Or enter custom amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                <Input
                  type="number"
                  placeholder="Enter amount per person"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-12 text-lg font-semibold"
                  min="50"
                  max="50000"
                />
              </div>
            </div>

            {amount && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Amount per person</span>
                  <span className="font-bold text-foreground">₦{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium text-foreground">{capacity}</span>
                </div>
                <div className="border-t border-border mt-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className={`font-bold text-lg ${canAfford ? 'text-green-500' : 'text-red-500'}`}>
                      ₦{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {!canAfford && totalAmount > 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    Insufficient balance. You need ₦{(totalAmount - (user?.balance || 0)).toLocaleString()} more.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Message */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Message (Optional)</CardTitle>
            <CardDescription>Add a personal touch to your gift</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write a message for your recipients..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {message.length}/500 characters
            </p>
          </CardContent>
        </Card>

        {/* Create Gift Button */}
        <Button
          onClick={handleCreateGift}
          disabled={!amount || parseFloat(amount) < 50 || !canAfford || creating}
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
        >
          {creating ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Gift Room...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IonIcon name="gift" size="20px" />
              Create Gift Room - ₦{totalAmount.toLocaleString()}
            </div>
          )}
        </Button>

        {/* Info Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <IonIcon name="information-circle" size="20px" color="#3b82f6" className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Recipients click your link to secure their spot</li>
                  <li>• They can sign up later and still claim their gift</li>
                  <li>• Unclaimed gifts are refunded after expiration</li>
                  <li>• You earn ₦100 referral bonus for each new user</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}