'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// FALLBACK SYSTEM - Multi-layer protection against failures

// Level 3 Fallback - Ultimate safety net
const EMERGENCY_FALLBACK = "Welcome to TADA VTU!";

// Level 2 Fallback - Core messages that always work
const CORE_FALLBACK_MESSAGES = [
  "Ready to recharge?",
  "Let's get you connected",
  "Your VTU partner",
  "Quick and reliable",
  "Best rates guaranteed",
];

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
  "Morning motivation loading...",
  "Sunrise, top-up time!",
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
  "Midday momentum building",
  "Afternoon energy boost needed?",
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
  "Sunset recharge time",
  "Evening entertainment awaits",
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
  "Insomnia? Stream something!",
  "Night warriors need data too",
];

// Balance-based messages with fallbacks
const LOW_BALANCE_MESSAGES = [
  "Time to fund your wallet!",
  "Low balance? Top up now",
  "Your wallet needs some love",
  "Fund up and keep moving",
  "Wallet looking light today",
  "Ready for a top-up?",
];

const HIGH_BALANCE_MESSAGES = [
  "Wallet looking healthy!",
  "Ready to spend? Let's go",
  "Big spender energy today",
  "Loaded and ready",
  "Your wallet is blessed!",
  "Money dey, let's spend am",
];

// General typewriter messages - Level 1 Fallback
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
  "Data don finish? We get you",
  "Airtime low? Fix am sharp",
  "Your digital life starts here",
  "Seamless transactions daily",
  "Trust the process, trust us",
];

// Safe message selection with fallbacks
const safeSelectMessage = (pool: string[]): string => {
  try {
    if (!pool || pool.length === 0) {
      console.warn('Empty message pool, using core fallback');
      return CORE_FALLBACK_MESSAGES[0];
    }
    
    const randomIndex = Math.floor(Math.random() * pool.length);
    const message = pool[randomIndex];
    
    if (!message || message.trim().length === 0) {
      console.warn('Invalid message selected, using fallback');
      return CORE_FALLBACK_MESSAGES[0];
    }
    
    return message;
  } catch (error) {
    console.error('Error selecting message:', error);
    return EMERGENCY_FALLBACK;
  }
};

// Get message pool with comprehensive fallbacks
const getMessagePool = (hour: number): string[] => {
  try {
    let timeBasedPool: string[] = [];
    
    // Select time-based pool
    if (hour >= 6 && hour < 12) {
      timeBasedPool = MORNING_GREETINGS;
    } else if (hour >= 12 && hour < 17) {
      timeBasedPool = AFTERNOON_GREETINGS;
    } else if (hour >= 17 && hour < 22) {
      timeBasedPool = EVENING_GREETINGS;
    } else {
      timeBasedPool = NIGHT_GREETINGS;
    }
    
    // Combine with general messages for variety
    const combinedPool = [
      ...timeBasedPool,
      ...TYPEWRITER_MESSAGES.slice(0, 8) // Add some general messages
    ];
    
    // Validate pool
    if (combinedPool.length === 0) {
      console.warn('Combined pool is empty, using typewriter messages');
      return TYPEWRITER_MESSAGES;
    }
    
    return combinedPool;
  } catch (error) {
    console.error('Error getting message pool:', error);
    return TYPEWRITER_MESSAGES; // Fallback to general messages
  }
};

export function useGreeting() {
  const [greeting, setGreeting] = useState(() => {
    // Safe initialization
    try {
      return safeSelectMessage(TYPEWRITER_MESSAGES);
    } catch (error) {
      console.error('Error initializing greeting:', error);
      return EMERGENCY_FALLBACK;
    }
  });

  const updateGreeting = useCallback(() => {
    try {
      const hour = new Date().getHours();
      const pool = getMessagePool(hour);
      const newGreeting = safeSelectMessage(pool);
      
      console.log(`Typewriter: Selected "${newGreeting}" from ${pool.length} messages (${hour}:00)`);
      setGreeting(newGreeting);
    } catch (error) {
      console.error('Error updating greeting:', error);
      setGreeting(EMERGENCY_FALLBACK);
    }
  }, []);

  useEffect(() => {
    // Set initial greeting
    updateGreeting();

    // Rotate greeting every 6 seconds with error handling
    const interval = setInterval(() => {
      updateGreeting();
    }, 6000);

    return () => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('Error clearing interval:', error);
      }
    };
  }, [updateGreeting]);

  return greeting;
}

export function getTimeBasedGreeting(name?: string) {
  try {
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
  } catch (error) {
    console.error('Error getting time-based greeting:', error);
    return {
      greeting: name ? `Hello, ${name}!` : 'Hello!',
      emoji: '👋',
    };
  }
}

export function getBalanceMessage(balance: number) {
  try {
    if (typeof balance !== 'number' || isNaN(balance)) {
      return null;
    }
    
    if (balance < 500) {
      return safeSelectMessage(LOW_BALANCE_MESSAGES);
    } else if (balance > 5000) {
      return safeSelectMessage(HIGH_BALANCE_MESSAGES);
    }
    return null;
  } catch (error) {
    console.error('Error getting balance message:', error);
    return null;
  }
}

// Hook for smart personalized greeting with comprehensive error handling
export function useSmartGreeting(userName?: string, balance?: number) {
  const typewriterMessage = useGreeting();
  
  const personalGreeting = useMemo(() => {
    try {
      const firstName = userName?.split(' ')[0];
      return getTimeBasedGreeting(firstName);
    } catch (error) {
      console.error('Error getting personal greeting:', error);
      return { greeting: 'Hello!', emoji: '👋' };
    }
  }, [userName]);

  const balanceMessage = useMemo(() => {
    try {
      if (balance !== undefined) {
        return getBalanceMessage(balance);
      }
      return null;
    } catch (error) {
      console.error('Error getting balance message:', error);
      return null;
    }
  }, [balance]);

  return {
    ...personalGreeting,
    typewriterMessage,
    balanceMessage,
  };
}