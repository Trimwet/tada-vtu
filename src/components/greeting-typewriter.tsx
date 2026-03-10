"use client";

import { useState, useEffect, useMemo } from "react";
import TextType from "./text-type";

interface GreetingTypewriterProps {
  className?: string;
  speed?: number;
}

// Time-based message pools
const MORNING_MESSAGES = [
  "Rise and shine fam, new day new hustle!",
  "Good morning boss, wetin you wan load today?",
  "Morning vibes, make we start with data?",
  "Early bird dey catch the cheapest deals o",
  "Fresh morning, fresh data loading...",
  "Start your day connected, no dulling",
  "Morning hustle don begin, I get you",
  "New day, new opportunities to save money",
  "Morning motivation dey here with TADA",
  "Sunrise don show, time to top up!",
];

const AFTERNOON_MESSAGES = [
  "Afternoon grind mode, we dey here",
  "Midday top-up? I get you covered",
  "Keep the hustle going, no stress",
  "Afternoon vibes, stay connected fam",
  "Lunch break = perfect time to load data",
  "Power through the afternoon with TADA",
  "Stay sharp, stay online",
  "Afternoon deals dey wait for you",
  "Midday momentum, let's keep am",
  "Afternoon energy low? Top up small",
];

const EVENING_MESSAGES = [
  "Evening vibes, chill and recharge with me",
  "Wind down small, but stay connected",
  "Evening hustle still dey, I get you",
  "Relax and keep enjoying your data",
  "Evening deals just dey for you",
  "End your day right with TADA",
  "Netflix and chill? Get data first o",
  "Evening scrolling needs data, no cap",
  "Sunset time = perfect recharge time",
  "Evening entertainment dey wait for you",
];

const NIGHT_MESSAGES = [
  "Night owl? I dey here for you 24/7",
  "Midnight data runs hit different",
  "Late night hustle, I see you",
  "Can't sleep? Load data instead",
  "Night mode activated, let's go",
  "Burning midnight oil? Stay connected",
  "Night shift? I got your back always",
  "Quiet hours, quick and safe recharge",
  "Insomnia? Stream something sharp sharp",
  "Night warriors need data too",
];

// Casual messages that can appear anytime
const CASUAL_MESSAGES = [
  "Your sharp guy for airtime & data",
  "No wahala, we got you covered",
  "Hustle smart, recharge smarter",
  "Save money, buy smart",
  "One tap, instant recharge",
  "Fast like lightning ⚡",
  "Best prices in the market",
  "Cheap data, fast delivery",
  "Your VTU family is here",
  "More data, less money",
  "Stay connected, stay winning",
  "Quick quick, no delay",
  "Data don finish? We get you",
  "Your digital life starts here",
  "We dey for you 24/7, no cap",
];

// Get time-based messages for current time of day
function getTimeBasedMessages(): string[] {
  const hour = new Date().getHours();
  
  let timeMessages: string[];
  if (hour >= 6 && hour < 12) {
    timeMessages = MORNING_MESSAGES;
  } else if (hour >= 12 && hour < 17) {
    timeMessages = AFTERNOON_MESSAGES;
  } else if (hour >= 17 && hour < 22) {
    timeMessages = EVENING_MESSAGES;
  } else {
    timeMessages = NIGHT_MESSAGES;
  }
  
  // Mix time-based messages with casual messages (50/50 split)
  return [...timeMessages, ...CASUAL_MESSAGES.slice(0, 5)];
}

export function GreetingTypewriter({ className = "", speed = 65 }: GreetingTypewriterProps) {
  // Get messages based on current time - stable reference
  const messages = useMemo(() => getTimeBasedMessages(), []);

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
