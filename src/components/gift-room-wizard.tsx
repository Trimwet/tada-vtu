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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IonIcon } from "@/components/ion-icon";
import { 
  GiftRoomType, 
  CreateGiftRoomRequest,
  GIFT_ROOM_LIMITS,
  validateGiftRoomCapacity,
  validateGiftAmount,
  calculateTotalAmount,
  getGiftRoomTypeLabel
} from "@/types/gift-room";

interface GiftRoomWizardProps {
  onComplete: (data: CreateGiftRoomRequest) => void;
  onCancel: () => void;
  userBalance: number;
  loading?: boolean;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export function GiftRoomWizard({ onComplete, onCancel, userBalance, loading = false }: GiftRoomWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateGiftRoomRequest>>({
    type: 'personal',
    capacity: 1,
    amount: 0,
    message: '',
    expiration_hours: 48
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleTypeChange = (type: GiftRoomType) => {
    const limits = GIFT_ROOM_LIMITS[type];
    setFormData(prev => ({
      ...prev,
      type,
      capacity: limits.min
    }));
  };

  const handleSubmit = () => {
    if (formData.type && formData.capacity && formData.amount) {
      onComplete({
        type: formData.type,
        capacity: formData.capacity,
        amount: formData.amount,
        message: formData.message || undefined,
        expiration_hours: formData.expiration_hours || 48
      });
    }
  };

  const totalAmount = formData.amount && formData.capacity 
    ? calculateTotalAmount(formData.capacity, formData.amount)
    : 0;
  const canAfford = userBalance >= totalAmount;

  const isStepValid = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!formData.type;
      case 2:
        return !!formData.capacity && formData.capacity > 0;
      case 3:
        return !!formData.amount && formData.amount >= 50 && canAfford;
      case 4:
        return true; // Message is optional
      default:
        return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                stepNum === step 
                  ? 'bg-green-500 text-white'
                  : stepNum < step
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {stepNum < step ? (
                  <IonIcon name="checkmark" size="16px" />
                ) : (
                  stepNum
                )}
              </div>
              {stepNum < 4 && (
                <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${
                  stepNum < step ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Create Gift Room</h2>
          <p className="text-muted-foreground">Step {step} of 4</p>
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Step 1: Gift Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Choose Gift Type
                </h3>
                <p className="text-muted-foreground">
                  Who will be able to receive your gift?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleTypeChange('personal')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    formData.type === 'personal'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.type === 'personal' ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <IonIcon name="person" size="20px" color={formData.type === 'personal' ? '#22c55e' : '#888'} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Personal Gift</p>
                      <p className="text-sm text-muted-foreground">Send to one specific person</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeChange('group')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    formData.type === 'group'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.type === 'group' ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <IonIcon name="people" size="20px" color={formData.type === 'group' ? '#22c55e' : '#888'} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Group Gift</p>
                      <p className="text-sm text-muted-foreground">Send to 2-50 people you know</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeChange('public')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    formData.type === 'public'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.type === 'public' ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <IonIcon name="megaphone" size="20px" color={formData.type === 'public' ? '#22c55e' : '#888'} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Public Giveaway</p>
                      <p className="text-sm text-muted-foreground">Open to anyone with the link (up to 1000)</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Capacity */}
          {step === 2 && formData.type && formData.type !== 'personal' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Number of Recipients
                </h3>
                <p className="text-muted-foreground">
                  How many people can claim this {getGiftRoomTypeLabel(formData.type).toLowerCase()}?
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipients ({GIFT_ROOM_LIMITS[formData.type].min}-{GIFT_ROOM_LIMITS[formData.type].max})</Label>
                  <Input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                    min={GIFT_ROOM_LIMITS[formData.type].min}
                    max={GIFT_ROOM_LIMITS[formData.type].max}
                    className="h-12 text-lg font-semibold text-center"
                  />
                </div>

                {formData.type === 'group' && (
                  <div className="flex flex-wrap gap-2">
                    {[2, 5, 10, 20].map((count) => (
                      <button
                        key={count}
                        onClick={() => setFormData(prev => ({ ...prev, capacity: count }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          formData.capacity === count
                            ? 'border-green-500 bg-green-500/10 text-green-500'
                            : 'border-border hover:border-green-500/50'
                        }`}
                      >
                        {count} people
                      </button>
                    ))}
                  </div>
                )}

                {formData.type === 'public' && (
                  <div className="flex flex-wrap gap-2">
                    {[50, 100, 250, 500].map((count) => (
                      <button
                        key={count}
                        onClick={() => setFormData(prev => ({ ...prev, capacity: count }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          formData.capacity === count
                            ? 'border-green-500 bg-green-500/10 text-green-500'
                            : 'border-border hover:border-green-500/50'
                        }`}
                      >
                        {count} people
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 for Personal (skip capacity) */}
          {step === 2 && formData.type === 'personal' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="person" size="32px" color="#22c55e" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Personal Gift
                </h3>
                <p className="text-muted-foreground">
                  This gift will be sent to one person
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Amount */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Gift Amount
                </h3>
                <p className="text-muted-foreground">
                  Amount each recipient will receive
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Quick Select</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((value) => (
                      <button
                        key={value}
                        onClick={() => setFormData(prev => ({ ...prev, amount: value }))}
                        className={`px-4 py-2 rounded-lg border transition-smooth text-sm font-medium ${
                          formData.amount === value
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
                      value={formData.amount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="pl-8 h-12 text-lg font-semibold"
                      min="50"
                      max="50000"
                    />
                  </div>
                </div>

                {formData.amount && formData.capacity && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Amount per person</span>
                      <span className="font-bold text-foreground">₦{formData.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Recipients</span>
                      <span className="font-medium text-foreground">{formData.capacity}</span>
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
                        Insufficient balance. You need ₦{(totalAmount - userBalance).toLocaleString()} more.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Message */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Personal Message
                </h3>
                <p className="text-muted-foreground">
                  Add a personal touch to your gift (optional)
                </p>
              </div>

              <div className="space-y-4">
                <Textarea
                  placeholder="Write a message for your recipients..."
                  value={formData.message || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  maxLength={500}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  {(formData.message || '').length}/500 characters
                </p>

                <div className="space-y-2">
                  <Label>Expiration Time</Label>
                  <div className="flex gap-2">
                    {[24, 48, 72, 168].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => setFormData(prev => ({ ...prev, expiration_hours: hours }))}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          formData.expiration_hours === hours
                            ? 'border-green-500 bg-green-500/10 text-green-500'
                            : 'border-border hover:border-green-500/50'
                        }`}
                      >
                        {hours < 24 ? `${hours}h` : `${hours / 24}d`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={step === 1 ? onCancel : handleBack}
          variant="outline"
          disabled={loading}
        >
          <IonIcon name="arrow-back" size="16px" className="mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!isStepValid(step) || loading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Next
            <IonIcon name="arrow-forward" size="16px" className="ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!isStepValid(step) || loading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </div>
            ) : (
              <>
                <IonIcon name="gift" size="16px" className="mr-2" />
                Create Gift Room
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}