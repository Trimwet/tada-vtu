// Constants for TADA VTU - Prices from Inlomax API (December 2025)

// Rich greeting messages - Nigerian Pidgin + English mix
export const GREETING_MESSAGES: string[] = [
  // Friendly & Casual
  "Wetin you wan buy today?",
  "Your sharp guy for airtime & data",
  "No wahala, we got you covered",
  "Ready to top up? Let's go!",
  "Stay connected, stay winning",

  // Motivational
  "Hustle smart, recharge smarter",
  "Big things loading for you today",
  "Your network, your power",
  "Success dey your side today",
  "Make today count, stay connected",

  // Time-based vibes
  "Morning hustle starts here",
  "Afternoon grind, data on deck",
  "Evening vibes, stay online",
  "Night owl? We dey here for you",

  // Money-conscious
  "Save money, buy smart",
  "Cheap data, fast delivery",
  "Your wallet go thank you",
  "Best prices in the market",
  "More data, less money",

  // Action-oriented
  "One tap, instant recharge",
  "Fast like lightning ⚡",
  "No stress, just recharge",
  "Quick quick, no delay",
  "Tap and go, simple as that",

  // Community vibes
  "Join the smart rechargers",
  "Thousands trust us daily",
  "Your VTU family is here",
  "We move together",
  "TADA gang for life",
];

export const NETWORKS: Array<{ value: string; label: string; color: string }> = [
  { value: "MTN", label: "MTN", color: "#FFCC00" },
  { value: "AIRTEL", label: "Airtel", color: "#ED1C24" },
  { value: "GLO", label: "Glo", color: "#00A95C" },
  { value: "9MOBILE", label: "9Mobile", color: "#006C35" },
];

export const SERVICE_TYPES = [
  { value: "airtime", label: "Airtime", icon: "Phone" },
  { value: "data", label: "Data", icon: "Wifi" },
  { value: "cable", label: "Cable TV", icon: "Tv" },
  { value: "electricity", label: "Electricity", icon: "Zap" },
  { value: "betting", label: "Betting", icon: "DollarSign" },
];


export const ELECTRICITY_PROVIDERS = [
  { value: "1", label: "Ikeja Electric (IKEDC)", code: "ikeja" },
  { value: "2", label: "Eko Electric (EKEDC)", code: "eko" },
];
