"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";

interface AiMessageGeneratorProps {
  senderName: string;
  recipientName?: string;
  occasion: string;
  amount: number;
  onGenerate: (message: string) => void;
  disabled?: boolean;
}

const TONE_OPTIONS = [
  { value: 'casual', label: 'Casual & Friendly', icon: 'happy-outline' },
  { value: 'formal', label: 'Formal & Respectful', icon: 'business-outline' },
  { value: 'funny', label: 'Light & Funny', icon: 'happy-outline' },
  { value: 'romantic', label: 'Romantic & Sweet', icon: 'heart-outline' },
  { value: 'grateful', label: 'Grateful & Appreciative', icon: 'thumbs-up-outline' },
] as const;

export function AiMessageGenerator({
  senderName,
  recipientName,
  occasion,
  amount,
  onGenerate,
  disabled = false
}: AiMessageGeneratorProps) {
  const [selectedTone, setSelectedTone] = useState<string>('casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToneSelector, setShowToneSelector] = useState(false);

  const handleGenerate = async () => {
    if (!senderName || !occasion || !amount) {
      toast.error("Please fill in the required fields first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/gifts/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          recipientName,
          occasion,
          amount,
          tone: selectedTone,
        }),
      });

      const result = await response.json();
      
      if (result.status) {
        onGenerate(result.data.message);
        if (result.data.fallback) {
          toast.info("Generated using fallback templates");
        } else {
          toast.success("Message generated!");
        }
        setShowToneSelector(false);
      } else {
        toast.error(result.message || "Failed to generate message");
      }
    } catch (error) {
      console.error('Generate message error:', error);
      toast.error("Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Generate Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowToneSelector(!showToneSelector)}
          disabled={disabled || isGenerating}
          className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 transition-smooth"
        >
          <IonIcon name="sparkles" size="16px" />
          Generate Message
        </Button>
        
        {showToneSelector && (
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={disabled || isGenerating}
            className="bg-green-500 hover:bg-green-600 text-white transition-smooth"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <IonIcon name="wand" size="16px" />
                Create
              </div>
            )}
          </Button>
        )}
      </div>

      {/* Tone Selector */}
      {showToneSelector && (
        <div className="animate-slide-up bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IonIcon name="color-palette-outline" size="16px" className="text-green-500" />
            Choose Message Tone
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => setSelectedTone(tone.value)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-smooth text-left ${
                  selectedTone === tone.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-border hover:border-green-200 hover:bg-muted/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTone === tone.value ? 'bg-green-500' : 'bg-muted'
                }`}>
                  <IonIcon 
                    name={tone.icon} 
                    size="16px" 
                    color={selectedTone === tone.value ? 'white' : undefined}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">{tone.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tone.value === 'casual' && 'Friendly and relaxed'}
                    {tone.value === 'formal' && 'Professional and respectful'}
                    {tone.value === 'funny' && 'Light-hearted with humor'}
                    {tone.value === 'romantic' && 'Loving and affectionate'}
                    {tone.value === 'grateful' && 'Thankful and appreciative'}
                  </p>
                </div>
                {selectedTone === tone.value && (
                  <IonIcon name="checkmark-circle" size="20px" className="text-green-500 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}