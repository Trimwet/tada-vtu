"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useBytezAI } from "@/hooks/useBytezAI";

interface AITypewriterProps {
  userName?: string;
  balance?: number;
  type?: "greeting" | "tip" | "quote";
  className?: string;
  speed?: number;
  reshuffleInterval?: number; // Time in milliseconds to reshuffle (default: 15 seconds)
}

// Fallback message arrays for variety when AI is unavailable or returns similar content
const FALLBACK_MESSAGES = {
  greeting: [
    "Ready to top up today?",
    "What can we help you with?",
    "Great to see you back!",
    "Let's get you connected!",
    "Your digital wallet awaits!",
    "Time for some quick recharge?",
    "Welcome to your dashboard!",
    "Ready for seamless transactions?",
  ],
  tip: [
    "Buy data bundles for better value than daily plans.",
    "Set up auto-recharge to never run out of airtime.",
    "Check our deals page for special discounts.",
    "Refer friends to earn bonus credits.",
    "MTN SME data offers the best rates.",
    "Weekend data plans are often cheaper.",
    "Bundle purchases save you more money.",
    "Track your usage to optimize spending.",
  ],
  quote: [
    "Small savings today, big rewards tomorrow.",
    "Every naira saved is a step toward your goals.",
    "Smart spending is the foundation of wealth.",
    "Consistency in saving builds financial freedom.",
    "Your future self will thank you for saving today.",
    "Wise spending today, prosperity tomorrow.",
    "Financial discipline creates lasting success.",
    "Every transaction is a step toward your dreams.",
  ],
};

export function AITypewriter({ 
  userName, 
  balance, 
  type = "greeting", 
  className = "", 
  speed = 50,
  reshuffleInterval = 15000 
}: AITypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [fullText, setFullText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [useAI, setUseAI] = useState(true);
  const { generateGreeting, generateTip, generateQuote, loading } = useBytezAI();
  const reshuffleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedReshuffling = useRef(false);

  // Get a random fallback message
  const getFallbackMessage = useCallback(() => {
    const messages = FALLBACK_MESSAGES[type];
    const randomIndex = Math.floor(Math.random() * messages.length);
    let message = messages[randomIndex];
    
    // Personalize greeting messages
    if (type === "greeting" && userName) {
      const personalizedGreetings = [
        `Hey ${userName}! ${message}`,
        `Good to see you, ${userName}! ${message}`,
        `Welcome back, ${userName}! ${message}`,
        `Hi ${userName}! ${message}`,
      ];
      message = personalizedGreetings[Math.floor(Math.random() * personalizedGreetings.length)];
    }
    
    return message;
  }, [type, userName, messageIndex]);

  const fetchText = useCallback(async () => {
    console.log(`Fetching text for messageIndex: ${messageIndex}, type: ${type}`);
    let text = "";
    
    // Always try AI first with variation
    if (useAI) {
      try {
        let aiResult = "";
        switch (type) {
          case "greeting":
            aiResult = await generateGreeting(userName || "there", balance || 0, messageIndex);
            break;
          case "tip":
            aiResult = await generateTip(`transaction_${messageIndex}`, messageIndex);
            break;
          case "quote":
            aiResult = await generateQuote(messageIndex);
            break;
        }
        
        console.log(`AI raw result: "${aiResult}"`);
        
        // Check if AI returned a valid result
        if (aiResult && aiResult.trim().length > 0 && aiResult.trim() !== "Welcome back!") {
          text = aiResult.trim();
          console.log(`Using AI generated text: "${text}"`);
        } else {
          console.log("AI returned empty or default response, using fallback");
        }
      } catch (error) {
        console.warn("AI generation failed, using fallback:", error);
        setUseAI(false);
      }
    }
    
    // Use fallback if AI failed or returned empty
    if (!text || text.trim().length === 0) {
      text = getFallbackMessage();
      console.log(`Using fallback message: "${text}"`);
    }
    
    if (text) {
      setFullText(text);
      setIsTyping(true);
    }
  }, [type, userName, balance, generateGreeting, generateTip, generateQuote, messageIndex, useAI, getFallbackMessage]);

  // Initial fetch
  useEffect(() => {
    fetchText();
  }, []);

  // Handle message index changes (reshuffling)
  useEffect(() => {
    if (messageIndex > 0) {
      fetchText();
    }
  }, [messageIndex]);

  // Start reshuffling after first message completes
  useEffect(() => {
    if (!isTyping && fullText && !hasStartedReshuffling.current && reshuffleInterval > 0) {
      console.log('Starting reshuffle cycle...');
      hasStartedReshuffling.current = true;
      
      const startReshuffling = () => {
        reshuffleTimeoutRef.current = setTimeout(() => {
          console.log('Reshuffling message...');
          setMessageIndex(prev => prev + 1);
          startReshuffling(); // Continue the cycle
        }, reshuffleInterval);
      };
      
      startReshuffling();
    }

    return () => {
      if (reshuffleTimeoutRef.current) {
        clearTimeout(reshuffleTimeoutRef.current);
      }
    };
  }, [isTyping, fullText, reshuffleInterval]);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || !fullText) return;

    let index = 0;
    setDisplayText("");

    typewriterIntervalRef.current = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
        }
      }
    }, speed);

    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, [fullText, isTyping, speed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reshuffleTimeoutRef.current) {
        clearTimeout(reshuffleTimeoutRef.current);
      }
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

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
