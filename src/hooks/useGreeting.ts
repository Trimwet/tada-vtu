'use client';

import { useState, useEffect, useMemo } from 'react';

// Time-based greeting pools
const MORNING_GREETINGS = [
  "Rise and shine! Ready to hustle?",
  "Good morning boss! Wetin you wan buy?",
  "Morning vibes, let's get this bread",
  "Early bird catches the data deals",
  "Fresh morning, fresh recharge",
  "Start your day connected",
  "Morning hustle starts here",
  "New day, new opportunities",
];

const AFTERNOON_GREETINGS = [
  "Afternoon grind mode activated",
  "Midday top-up? We got you",
  "Keep the hustle going strong",
  "Afternoon vibes, stay connected",
  "Lunch break recharge time",
  "Power through the afternoon",
  "Stay sharp, stay online",
  "Afternoon deals await you",
];

const EVENING_GREETINGS = [
  "Evening vibes, chill and recharge",
  "Wind down with some data",
  "Evening hustle still strong",
  "Relax and stay connected",
  "Evening deals just for you",
  "End your day right",
  "Netflix and chill? Get data first",
  "Evening scrolling needs data",
];

const NIGHT_GREETINGS = [
  "Night owl? We dey here for you",
  "Midnight data runs hit different",
  "Late night hustle recognized",
  "Can't sleep? Buy data instead",
  "Night mode activated",
  "Burning midnight oil? Stay connected",
  "Night shift? We got your back",
  "Quiet hours, quick recharge",
];

// Balance-based messages
const LOW_BALANCE_MESSAGES = [
  "Time to fund your wallet!",
  "Low balance? Top up now",
  "Your wallet needs some love",
  "Fund up and keep moving",
];

const HIGH_BALANCE_MESSAGES = [
  "Wallet looking healthy!",
  "Ready to spend? Let's go",
  "Big spender energy today",
  "Loaded and ready",
];

// General typewriter messages
const TYPEWRITER_MESSAGES = [
  "Wetin you wan buy today?",
  "Your sharp guy for airtime & data",
  "No wahala, we got you covered",
  "Hustle smart, recharge smarter",
  "Save money, buy smart",
  "One tap, instant recharge",
  "Fast like lightning ⚡",
  "Best prices in the market",
  "Cheap data, fast delivery",
  "Your VTU family is here",
  "Thousands trust us daily",
  "More data, less money",
  "Stay connected, stay winning",
  "Quick quick, no delay",
  "Success dey your side today",
];

export function useGreeting() {
  const [greeting, setGreeting] = useState(TYPEWRITER_MESSAGES[0]);

  useEffect(() => {
    // Set initial greeting based on time
    const hour = new Date().getHours();
    let pool = TYPEWRITER_MESSAGES;
    
    if (hour >= 5 && hour < 12) pool = [...MORNING_GREETINGS, ...TYPEWRITER_MESSAGES.slice(0, 5)];
    else if (hour >= 12 && hour < 17) pool = [...AFTERNOON_GREETINGS, ...TYPEWRITER_MESSAGES.slice(0, 5)];
    else if (hour >= 17 && hour < 21) pool = [...EVENING_GREETINGS, ...TYPEWRITER_MESSAGES.slice(0, 5)];
    else pool = [...NIGHT_GREETINGS, ...TYPEWRITER_MESSAGES.slice(0, 5)];

    setGreeting(pool[Math.floor(Math.random() * pool.length)]);

    // Rotate greeting every 6 seconds
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setGreeting(pool[randomIndex]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return greeting;
}

export function getTimeBasedGreeting(name?: string) {
  const hour = new Date().getHours();
  let timeGreeting = 'Good evening';
  let emoji = '🌙';
  
  if (hour >= 6 && hour < 12) {
    timeGreeting = 'Good morning';
    emoji = '☀️';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
    emoji = '🌤️';
  } else if (hour >= 17 && hour < 22) {
    timeGreeting = 'Good evening';
    emoji = '🌅';
  } else {
    timeGreeting = 'Hey night owl';
    emoji = '🦉';
  }

  return {
    greeting: name ? `${timeGreeting}, ${name}!` : timeGreeting,
    emoji,
  };
}

export function getBalanceMessage(balance: number) {
  if (balance < 500) {
    return LOW_BALANCE_MESSAGES[Math.floor(Math.random() * LOW_BALANCE_MESSAGES.length)];
  } else if (balance > 5000) {
    return HIGH_BALANCE_MESSAGES[Math.floor(Math.random() * HIGH_BALANCE_MESSAGES.length)];
  }
  return null;
}

// Hook for smart personalized greeting
export function useSmartGreeting(userName?: string, balance?: number) {
  const typewriterMessage = useGreeting();
  
  const personalGreeting = useMemo(() => {
    const { greeting, emoji } = getTimeBasedGreeting(userName?.split(' ')[0]);
    return { greeting, emoji };
  }, [userName]);

  const balanceMessage = useMemo(() => {
    if (balance !== undefined) {
      return getBalanceMessage(balance);
    }
    return null;
  }, [balance]);

  return {
    ...personalGreeting,
    typewriterMessage,
    balanceMessage,
  };
}
