"use client";

import { useState, useEffect } from "react";
import { useGreeting } from "@/hooks/useGreeting";

interface GreetingTypewriterProps {
  className?: string;
  speed?: number;
}

export function GreetingTypewriter({ className = "", speed = 50 }: GreetingTypewriterProps) {
  const greeting = useGreeting();
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!greeting) return;

    setIsTyping(true);
    setDisplayText("");
    let index = 0;

    const interval = setInterval(() => {
      if (index < greeting.length) {
        setDisplayText(greeting.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [greeting, speed]);

  return (
    <span className={className}>
      {displayText}
      {isTyping && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5" />}
    </span>
  );
}