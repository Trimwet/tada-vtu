"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "sonner";

interface AiMessageGeneratorProps {
  senderName: string;
  recipientName: string;
  occasion: string;
  onGenerate: (message: string) => void;
  className?: string;
}

export function AiMessageGenerator({
  senderName,
  recipientName,
  occasion,
  onGenerate,
  className,
}: AiMessageGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<string>("casual");

  const handleGenerate = async () => {
    if (!occasion) {
      toast.error("Please select an occasion first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          recipientName,
          occasion,
          tone,
        }),
      });

      const data = await response.json();
      if (data.status) {
        onGenerate(data.message);
        toast.success("Message generated!");
      } else {
        toast.error("Failed to generate message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={tone} onValueChange={setTone}>
        <SelectTrigger className="w-[110px] h-9 text-xs">
          <SelectValue placeholder="Tone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="casual">Casual</SelectItem>
          <SelectItem value="funny">Funny</SelectItem>
          <SelectItem value="romantic">Romantic</SelectItem>
          <SelectItem value="formal">Formal</SelectItem>
          <SelectItem value="poetic">Poetic</SelectItem>
          <SelectItem value="pidgin">Pidgin</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="h-9 gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 text-purple-600 dark:text-purple-400"
      >
        {loading ? (
          <IonIcon name="refresh" className="animate-spin" />
        ) : (
          <IonIcon name="sparkles" />
        )}
        <span className="hidden sm:inline">AI Write</span>
      </Button>
    </div>
  );
}
