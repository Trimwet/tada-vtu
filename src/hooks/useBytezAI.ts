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
}

export function useBytezAI() {
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (type: string, context: BytezContext): Promise<string> => {
    setLoading(true);
    try {
      const response = await fetch("/api/bytez", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      });
      const data = await response.json();
      return data.output || "";
    } catch (error) {
      console.error("Bytez error:", error);
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  const generateGreeting = useCallback(
    (userName: string, balance: number) => {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      return generate("greeting", { userName, timeOfDay, balance });
    },
    [generate]
  );

  const generateTip = useCallback(
    (transactionType: string) => generate("tip", { transactionType }),
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

  const generateQuote = useCallback(() => generate("quote", {}), [generate]);

  return {
    loading,
    generateGreeting,
    generateTip,
    generateToast,
    generateGiftMessage,
    generateQuote,
  };
}
