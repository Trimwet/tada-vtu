// Constants for TADA VTU

export const GREETING_MESSAGES = [
  "Ready to buy your data? 🚀",
  "Top up your airtime in seconds! ⚡",
  "Never run out of data again 📱",
  "Pay your bills with ease 💳",
  "Fast, secure, reliable VTU services 🔒",
  "Stay connected with affordable data 🌐",
  "Instant airtime recharge awaits! 💨",
  "Your one-stop VTU solution 🎯",
];

export const NETWORKS: Array<{ value: string; label: string; color: string }> =
  [
    { value: "MTN", label: "MTN", color: "#FFCC00" },
    { value: "Airtel", label: "Airtel", color: "#ED1C24" },
    { value: "Glo", label: "Glo", color: "#00A95C" },
    { value: "9mobile", label: "9mobile", color: "#00A650" },
  ];

export const SERVICE_TYPES = [
  { value: "airtime", label: "Airtime", icon: "Phone" },
  { value: "data", label: "Data", icon: "Wifi" },
  { value: "cable", label: "Cable TV", icon: "Tv" },
  { value: "electricity", label: "Electricity", icon: "Zap" },
  { value: "betting", label: "Betting", icon: "DollarSign" },
];

// Data plans with selling prices (cost + small markup for profit)
// Markup: SME +₦10-20, Gifting +₦15-30, Corporate +₦20-50
export const DATA_PLANS = {
  MTN: [
    // SME Plans (cheapest - small markup)
    { id: "mtn-sme-500mb", name: "500MB", size: "500MB", validity: "30 days", price: 155, type: "sme" },
    { id: "mtn-sme-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 280, type: "sme" },
    { id: "mtn-sme-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 550, type: "sme" },
    { id: "mtn-sme-3gb", name: "3GB", size: "3GB", validity: "30 days", price: 820, type: "sme" },
    { id: "mtn-sme-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1370, type: "sme" },
    { id: "mtn-sme-10gb", name: "10GB", size: "10GB", validity: "30 days", price: 2720, type: "sme" },
    // Gifting Plans
    { id: "mtn-gift-500mb", name: "500MB", size: "500MB", validity: "30 days", price: 185, type: "gifting" },
    { id: "mtn-gift-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 355, type: "gifting" },
    { id: "mtn-gift-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 700, type: "gifting" },
    { id: "mtn-gift-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1720, type: "gifting" },
    // Corporate Plans
    { id: "mtn-corp-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1570, type: "corporate" },
    { id: "mtn-corp-10gb", name: "10GB", size: "10GB", validity: "30 days", price: 2900, type: "corporate" },
    { id: "mtn-corp-20gb", name: "20GB", size: "20GB", validity: "30 days", price: 5350, type: "corporate" },
  ],
  Airtel: [
    // SME Plans
    { id: "airtel-sme-500mb", name: "500MB", size: "500MB", validity: "30 days", price: 150, type: "sme" },
    { id: "airtel-sme-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 280, type: "sme" },
    { id: "airtel-sme-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 550, type: "sme" },
    { id: "airtel-sme-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1370, type: "sme" },
    // Gifting Plans
    { id: "airtel-gift-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 310, type: "gifting" },
    { id: "airtel-gift-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 600, type: "gifting" },
    { id: "airtel-gift-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1480, type: "gifting" },
    { id: "airtel-gift-10gb", name: "10GB", size: "10GB", validity: "30 days", price: 2720, type: "gifting" },
    // Corporate Plans
    { id: "airtel-corp-10gb", name: "10GB", size: "10GB", validity: "30 days", price: 2820, type: "corporate" },
    { id: "airtel-corp-25gb", name: "25GB", size: "25GB", validity: "30 days", price: 6300, type: "corporate" },
  ],
  Glo: [
    // SME Plans
    { id: "glo-sme-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 275, type: "sme" },
    { id: "glo-sme-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 540, type: "sme" },
    { id: "glo-sme-3gb", name: "3GB", size: "3GB", validity: "30 days", price: 800, type: "sme" },
    { id: "glo-sme-5gb", name: "5GB", size: "5GB", validity: "30 days", price: 1340, type: "sme" },
    // Gifting Plans
    { id: "glo-gift-1.5gb", name: "1.5GB", size: "1.5GB", validity: "30 days", price: 410, type: "gifting" },
    { id: "glo-gift-3gb", name: "3GB", size: "3GB", validity: "30 days", price: 900, type: "gifting" },
    { id: "glo-gift-7gb", name: "7GB", size: "7GB", validity: "30 days", price: 1880, type: "gifting" },
    { id: "glo-gift-10gb", name: "10GB", size: "10GB", validity: "30 days", price: 2670, type: "gifting" },
  ],
  "9mobile": [
    // SME Plans
    { id: "9mobile-sme-500mb", name: "500MB", size: "500MB", validity: "30 days", price: 145, type: "sme" },
    { id: "9mobile-sme-1gb", name: "1GB", size: "1GB", validity: "30 days", price: 280, type: "sme" },
    { id: "9mobile-sme-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 555, type: "sme" },
    // Gifting Plans
    { id: "9mobile-gift-1.5gb", name: "1.5GB", size: "1.5GB", validity: "30 days", price: 430, type: "gifting" },
    { id: "9mobile-gift-2gb", name: "2GB", size: "2GB", validity: "30 days", price: 570, type: "gifting" },
    { id: "9mobile-gift-4.5gb", name: "4.5GB", size: "4.5GB", validity: "30 days", price: 1260, type: "gifting" },
    { id: "9mobile-gift-11gb", name: "11GB", size: "11GB", validity: "30 days", price: 3020, type: "gifting" },
  ],
};

export const CABLE_PROVIDERS = [
  { value: "dstv", label: "DSTV", icon: "tv" },
  { value: "gotv", label: "GOTV", icon: "tv" },
  { value: "startimes", label: "Startimes", icon: "tv" },
  { value: "showmax", label: "Showmax", icon: "play-circle" },
];

// Cable plans with ₦50-100 service fee included
export const CABLE_PLANS = {
  dstv: [
    { id: "dstv-padi", name: "Padi", price: 3000, code: "dstv-padi" },
    { id: "dstv-yanga", name: "Yanga", price: 4250, code: "dstv-yanga" },
    { id: "dstv-confam", name: "Confam", price: 7500, code: "dstv-confam" },
    { id: "dstv-compact", name: "Compact", price: 12600, code: "dstv-compact" },
    { id: "dstv-compact-plus", name: "Compact Plus", price: 19900, code: "dstv-compact-plus" },
    { id: "dstv-premium", name: "Premium", price: 29600, code: "dstv-premium" },
  ],
  gotv: [
    { id: "gotv-smallie", name: "Smallie", price: 1350, code: "gotv-smallie" },
    { id: "gotv-jinja", name: "Jinja", price: 2750, code: "gotv-jinja" },
    { id: "gotv-jolli", name: "Jolli", price: 4000, code: "gotv-jolli" },
    { id: "gotv-max", name: "Max", price: 5800, code: "gotv-max" },
    { id: "gotv-supa", name: "Supa", price: 7700, code: "gotv-supa" },
  ],
  startimes: [
    { id: "startimes-nova", name: "Nova", price: 1250, code: "startimes-nova" },
    { id: "startimes-basic", name: "Basic", price: 2150, code: "startimes-basic" },
    { id: "startimes-smart", name: "Smart", price: 3550, code: "startimes-smart" },
    { id: "startimes-classic", name: "Classic", price: 3850, code: "startimes-classic" },
    { id: "startimes-super", name: "Super", price: 5400, code: "startimes-super" },
  ],
  showmax: [
    { id: "showmax-mobile", name: "Mobile", price: 1250, code: "showmax-mobile" },
    { id: "showmax-pro-mobile", name: "Pro Mobile", price: 2150, code: "showmax-pro-mobile" },
    { id: "showmax-standard", name: "Standard", price: 2950, code: "showmax-standard" },
    { id: "showmax-pro", name: "Pro", price: 6400, code: "showmax-pro" },
  ],
};

export const ELECTRICITY_PROVIDERS = [
  { value: "ikeja-electric", label: "Ikeja Electric (IKEDC)", icon: "zap" },
  { value: "eko-electric", label: "Eko Electric (EKEDC)", icon: "zap" },
  { value: "abuja-electric", label: "Abuja Electric (AEDC)", icon: "zap" },
  { value: "ibadan-electric", label: "Ibadan Electric (IBEDC)", icon: "zap" },
  { value: "kano-electric", label: "Kano Electric (KEDCO)", icon: "zap" },
  { value: "enugu-electric", label: "Enugu Electric (EEDC)", icon: "zap" },
  {
    value: "port-harcourt-electric",
    label: "Port Harcourt Electric (PHED)",
    icon: "zap",
  },
  { value: "jos-electric", label: "Jos Electric (JED)", icon: "zap" },
  { value: "benin-electric", label: "Benin Electric (BEDC)", icon: "zap" },
];
