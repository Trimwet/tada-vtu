"use client";

import { useState, useEffect, useCallback } from "react";
import { useBytezAI } from "@/hooks/useBytezAI";

interface AITypewriterProps {
  userName?: string;
  balance?: number;
  type?: "greeting" | "tip" | "quote";
  className?: string;
  speed?: number;
}

export function AITypewriter({ userName, balance, type = "greeting", className = "", speed = 50 }: AITypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [fullText, setFullText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { generateGreeting, generateTip, generateQuote, loading } = useBytezAI();

  const fetchText = useCallback(async () => {
    let text = "";
    switch (type) {
      case "greeting":
        text = await generateGreeting(userName || "there", balance || 0);
        break;
      case "tip":
        text = await generateTip("made a transaction");
        break;
      case "quote":
        text = await generateQuote();
        break;
    }
    if (text) {
      setFullText(text);
      setIsTyping(true);
    }
  }, [type, userName, balance, generateGreeting, generateTip, generateQuote]);

  useEffect(() => {
    fetchText();
  }, [fetchText]);

  useEffect(() => {
    if (!isTyping || !fullText) return;

    let index = 0;
    setDisplayText("");

    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [fullText, isTyping, speed]);

  if (loading && !displayText) {
    return (
      <span className={`${className} animate-pulse`}>
        <span className="inline-block w-2 h-4 bg-current animate-pulse" />
      </span>
    );
  }

  return (
    <span className={className}>
      {displayText}
      {isTyping && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5" />}
    </span>
  );
}

// Simple version without AI - just typewriter effect
export function Typewriter({ text, className = "", speed = 50 }: { text: string; className?: string; speed?: number }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayText("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayText}
      {displayText.length < text.length && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5" />}
    </span>
  );
}
