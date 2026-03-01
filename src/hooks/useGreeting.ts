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
  "Oya na, make we load before traffic jam",
  "Morning don break, your data don finish again?",
  "Abeg make we buy data before the day spoil",
  "Good morning o! Wallet dey smile?",
  "E don do for sleep, time to buy data sharp",
  "Morning blessings + data blessings = winning",
  "Chai! Another day to save with TADA",
  "Your morning data plug don land",
  "Breakfast or data first? You decide 😄",
  "Morning king/queen, tell me wetin you need",
];

const AFTERNOON_GREETINGS = [
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
  "Afternoon don reach, your data don finish?",
  "Oya come buy data make work sweet",
  "Sun dey hot but our prices dey cooler",
  "Afternoon stress? Buy data relax small",
  "Your afternoon streaming needs data o",
  "Lunch time = data time, facts!",
  "Afternoon vibes, cheap data vibes",
  "Wetin you dey stream this hot afternoon?",
  "Make afternoon no bore you, load data!",
  "Your afternoon plug don show up",
];

const EVENING_GREETINGS = [
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
  "Evening don reach, make we flex small",
  "After work vibes, buy data and relax",
  "Oya na, time to stream that movie",
  "Evening gist needs data, buy am now",
  "Your evening entertainment plug don show",
  "Sunset loading… your data ready?",
  "Evening cruise needs unlimited data",
  "Time to catch up on Twitter and IG",
  "Evening vibes, no dulling allowed!",
  "Your evening data plug don land",
];

const NIGHT_GREETINGS = [
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
  "Midnight gang, una data don finish?",
  "Who no dey sleep? Make we buy data",
  "Night shift workers, TADA see you o",
  "3am and you still online? Legend!",
  "Insomnia gang, data na the cure",
  "Night time na best time to binge",
  "Vampire hours but we still dey work",
  "Your midnight data plug never sleep",
  "Night owls deserve the cheapest data",
  "Shey you no go sleep? Buy data first 😄",
];

// Balance-based messages with fallbacks
const LOW_BALANCE_MESSAGES = [
  "Time to fund your wallet!",
  "Low balance? Top up now",
  "Your wallet needs some love",
  "Fund up and keep moving",
  "Wallet looking light today",
  "Ready for a top-up?",
  "Omo, your wallet don dry o",
  "Abeg, make you add money small",
  "Wallet dey cry, fund am sharp",
  "E be like say money don finish",
  "Your wallet need urgent attention",
  "Make we load this wallet quick",
  "Shey you go fund wallet today?",
  "Wallet balance dey on red alert",
];

const HIGH_BALANCE_MESSAGES = [
  "Wallet looking healthy!",
  "Ready to spend? Let's go",
  "Big spender energy today",
  "Loaded and ready",
  "Your wallet is blessed!",
  "Money dey, let's spend am",
  "Omo! Money dey your wallet o",
  "Big man/woman things, wallet full",
  "You don load wallet well well",
  "Shey na Dangote be this? 😄",
  "Your wallet dey smile today",
  "Money plenty, make we flex",
  "Wallet balance looking correct!",
  "You sabi save money, I hail o",
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
  "E don tey wey you buy data?",
  "Your data plug don show up",
  "Oya na, make we do business",
  "No stress, just buy and go",
  "We dey for you 24/7, no cap",
  "Your money safe with us",
  "Fastest VTU for Naija",
  "Data wey go last you well well",
  "Cheap pass your neighbor's plug",
  "Make we help you save money",
  "Your wallet go thank you later",
  "Reliable pass NEPA 😄",
  "We no dey disappoint, I swear",
  "Your number one data dealer",
  "Shey you don chop? Buy data too",
  "Data na life, buy am make e sweet",
  "We dey deliver sharp sharp",
  "No hidden charges, na straight",
  "Your mama go proud of this deal",
  "Better than black market prices",
  "Data wey go make you smile",
  "Oya come flex with us",
  "We dey online, waiting for you",
  "Your personal data assistant",
  "Make we sort you out today",
  "Cheap data, premium service",
  "We no dey play with your money",
  "Trust us, we no go disappoint",
  "Your satisfaction na our priority",
  "Data wey sweet pass sugar",
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
    
    // Select time-based pool - SYNCHRONIZED with getTimeBasedGreeting
    if (hour >= 6 && hour < 12) {
      timeBasedPool = MORNING_GREETINGS;
    } else if (hour >= 12 && hour < 17) {
      timeBasedPool = AFTERNOON_GREETINGS;
    } else if (hour >= 17 && hour < 22) {
      timeBasedPool = EVENING_GREETINGS;
    } else {
      // Night time: 22:00 - 05:59 (10 PM to 6 AM)
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
    
    // Synchronized with useGreeting time ranges
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
      // Night time: 22:00 - 05:59 (10 PM to 6 AM)
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