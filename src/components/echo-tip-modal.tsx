"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";

interface EchoTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: string;
  savingsEstimate?: number;
  actionType?: string;
  transactionType: string;
  network: string;
  amount: number;
}

export function EchoTipModal({
  isOpen,
  onClose,
  tip,
  savingsEstimate,
  actionType,
  transactionType,
  network,
  amount,
}: EchoTipModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Animate tip appearance
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowTip(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowTip(false);
    }
  }, [isOpen]);

  // Text-to-speech function (FREE - uses browser API)
  const speakTip = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(tip);
    utterance.lang = "en-NG"; // Nigerian English
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  }, [tip]);

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const getActionIcon = () => {
    switch (actionType) {
      case "timing":
        return "time-outline";
      case "bundle":
        return "layers-outline";
      case "network":
        return "swap-horizontal-outline";
      case "promo":
        return "gift-outline";
      default:
        return "bulb-outline";
    }
  };

  const getActionLabel = () => {
    switch (actionType) {
      case "timing":
        return "Timing Tip";
      case "bundle":
        return "Bundle Tip";
      case "network":
        return "Network Tip";
      case "promo":
        return "Promo Alert";
      default:
        return "Smart Tip";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/10 overflow-hidden transform transition-all duration-500 ${
          showTip ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
        }`}
      >
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <IonIcon name="checkmark-circle" size="28px" color="white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Transaction Successful!</h3>
              <p className="text-green-100 text-sm">
                ₦{amount.toLocaleString()} {network} {transactionType}
              </p>
            </div>
          </div>
        </div>

        {/* Echo Tip Section */}
        <div className="p-6 space-y-4">
          {/* Tip Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 rounded-full">
              <IonIcon name={getActionIcon()} size="14px" color="#eab308" />
              <span className="text-yellow-500 text-xs font-semibold">{getActionLabel()}</span>
            </div>
            {savingsEstimate && savingsEstimate > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                <IonIcon name="trending-up" size="14px" color="#22c55e" />
                <span className="text-green-500 text-xs font-semibold">
                  Save ₦{savingsEstimate.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* The Tip */}
          <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
            <p className="text-white text-base leading-relaxed pl-4 font-medium">
              {tip}
            </p>
          </div>

          {/* Voice Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? stopSpeaking : speakTip}
              className={`flex items-center gap-2 border-gray-600 ${
                isPlaying
                  ? "bg-green-500/20 border-green-500 text-green-400"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <IonIcon
                name={isPlaying ? "stop-circle" : "volume-high"}
                size="18px"
              />
              {isPlaying ? "Stop" : "Listen"}
            </Button>
            <span className="text-gray-500 text-xs">
              {isPlaying ? "Playing..." : "Tap to hear this tip"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={onClose}
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
          >
            <IonIcon name="checkmark" size="20px" className="mr-2" />
            Got it, thanks!
          </Button>

          {/* Branding */}
          <p className="text-center text-gray-500 text-xs">
            💡 TADA Echo Tips - Your sharp guy for saving money
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to fetch and manage tips
export function useEchoTip() {
  const [tip, setTip] = useState<{
    tip: string;
    savingsEstimate?: number;
    actionType?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTip = async (params: {
    userId?: string;
    network: string;
    amount: number;
    type: "airtime" | "data" | "cable" | "electricity" | "betting";
    planName?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.status === "success" && result.data) {
        setTip(result.data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch tip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Clear tip after animation
    setTimeout(() => setTip(null), 300);
  };

  return {
    tip,
    isLoading,
    isModalOpen,
    fetchTip,
    closeModal,
  };
}
