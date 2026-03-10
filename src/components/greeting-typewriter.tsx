"use client";

import { useState, useEffect, useMemo } from "react";
import { useGreeting } from "@/hooks/useGreeting";
import TextType from "./text-type";

interface GreetingTypewriterProps {
  className?: string;
  speed?: number;
}

// Pool of messages to shuffle
const TYPEWRITER_MESSAGES = [
  "Ready to recharge?",
  "Let's get you connected",
  "Your VTU partner",
  "Quick and reliable",
  "Best rates guaranteed",
];

// Fisher-Yates shuffle algorithm - proper random shuffling
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function GreetingTypewriter({ className = "", speed = 65 }: GreetingTypewriterProps) {
  const greeting = useGreeting();
  
  // Create a stable shuffled order on initial render
  const [shuffledPool] = useState(() => shuffleArray(TYPEWRITER_MESSAGES));

  // Create messages array with greeting always first
  const messages = useMemo(() => {
    return greeting ? [greeting, ...shuffledPool] : shuffledPool;
  }, [greeting, shuffledPool]);

  return (
    <span className={className}>
      <TextType 
        text={messages}
        typingSpeed={speed}
        pauseDuration={7000}
        showCursor
        cursorCharacter="▎"
        deletingSpeed={35}
        cursorBlinkDuration={0.3}
        loop={true}
      />
    </span>
  );
}
