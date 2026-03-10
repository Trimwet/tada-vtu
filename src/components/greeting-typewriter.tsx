"use client";

import { useGreeting } from "@/hooks/useGreeting";
import TextType from "./text-type";

interface GreetingTypewriterProps {
  className?: string;
  speed?: number;
}

// Pool of messages to cycle through
const TYPEWRITER_MESSAGES = [
  "Ready to recharge?",
  "Let's get you connected",
  "Your VTU partner",
  "Quick and reliable",
  "Best rates guaranteed",
];

export function GreetingTypewriter({ className = "", speed = 65 }: GreetingTypewriterProps) {
  const greeting = useGreeting();

  // Use the greeting from hook plus our pool of messages for cycling
  const messages = greeting ? [greeting, ...TYPEWRITER_MESSAGES] : TYPEWRITER_MESSAGES;

  return (
    <span className={className}>
      <TextType 
        text={messages}
        typingSpeed={speed}
        pauseDuration={2500}
        showCursor
        cursorCharacter="▎"
        deletingSpeed={35}
        cursorBlinkDuration={0.3}
        loop={true}
      />
    </span>
  );
}
