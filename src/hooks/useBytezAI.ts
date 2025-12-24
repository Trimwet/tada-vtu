"use client";

import { useState, useCallback } from "react";

interface BytezContext {
  userName?: string;
  timeOfDay?: string;
  balance?: number;
  transactionType?: string;
  toastType?: string;
  message?: string;
  occasion?: string;
  recipientName?: string;
  variation?: number; // Add variation for different prompts
}

export function useBytezAI() {
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (type: string, context: BytezContext): Promise<string> => {
    setLoading(true);
    try {
      console.log(`Calling /api/bytez with type: ${type}, context:`, context);
      const response = await fetch("/api/bytez", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      });
      
      if (!response.ok) {
        console.error(`API response not ok: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        return "";
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      return data.output || "";
    } catch (error) {
      console.error("Bytez error:", error);
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  const generateGreeting = useCallback(
    (userName: string, balance: number, variation?: number) => {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      return generate("greeting", { userName, timeOfDay, balance, variation: variation || 0 });
    },
    [generate]
  );

  const generateTip = useCallback(
    (transactionType: string, variation?: number) => generate("tip", { transactionType, variation: variation || 0 }),
    [generate]
  );

  const generateToast = useCallback(
    (toastType: string, message: string) => generate("toast", { toastType, message }),
    [generate]
  );

  const generateGiftMessage = useCallback(
    (occasion: string, recipientName?: string) => generate("gift", { occasion, recipientName }),
    [generate]
  );

  const generateQuote = useCallback((variation?: number) => generate("quote", { variation: variation || 0 }), [generate]);

  return {
    loading,
    generateGreeting,
    generateTip,
    generateToast,
    generateGiftMessage,
    generateQuote,
  };
}
