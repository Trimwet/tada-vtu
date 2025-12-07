// Constants for TADA VTU - Prices from Inlomax API (December 2025)

export const GREETING_MESSAGES: string[] = [
  "Ready to buy your data? ",
  "Top up your airtime in seconds! ",
  "Never run out of data again ",
  "Pay your bills with ease ",
  "Fast, secure, reliable VTU services ",
  "Stay connected with affordable data ",
  "Instant airtime recharge awaits! ",
  "Your one-stop VTU solution ",
];

export const NETWORKS: Array<{ value: string; label: string; color: string }> = [
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

export const AIRTIME_DISCOUNTS: Record<string, { serviceId: string; discount: number }> = {
  MTN: { serviceId: "1", discount: 2.5 },
  Airtel: { serviceId: "2", discount: 2.5 },
  Glo: { serviceId: "3", discount: 4 },
  "9mobile": { serviceId: "4", discount: 4 },
};

export const DATA_TYPES = [
  { value: "sme", label: "SME/Share", description: "Cheapest rates" },
  { value: "corporate", label: "Corporate/CG", description: "Corporate gifting" },
  { value: "direct", label: "Direct", description: "Standard plans" },
  { value: "awoof", label: "Awoof/Gifting", description: "Special offers" },
  { value: "social", label: "Social", description: "Social media bundles" },
];

export interface DataPlan {
  id: string;
  name: string;
  size: string;
  validity: string;
  price: number;
  type: string;
}

export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: "97", name: "500MB", size: "500MB", validity: "7 days", price: 400, type: "sme" },
    { id: "98", name: "1GB", size: "1GB", validity: "30 days", price: 600, type: "sme" },
    { id: "99", name: "2GB", size: "2GB", validity: "30 days", price: 1080, type: "sme" },
    { id: "100", name: "3GB", size: "3GB", validity: "30 days", price: 1580, type: "sme" },
    { id: "101", name: "5GB", size: "5GB", validity: "30 days", price: 2000, type: "sme" },
  ],
  Airtel: [
    { id: "104", name: "150MB", size: "150MB", validity: "1 day", price: 80, type: "awoof" },
    { id: "105", name: "300MB", size: "300MB", validity: "2 days", price: 140, type: "awoof" },
    { id: "111", name: "600MB", size: "600MB", validity: "2 days", price: 250, type: "awoof" },
  ],
  Glo: [
    { id: "35", name: "500MB", size: "500MB", validity: "30 days", price: 230, type: "corporate" },
    { id: "36", name: "1GB", size: "1GB", validity: "30 days", price: 450, type: "corporate" },
  ],
  "9mobile": [],
};

export const CABLE_PROVIDERS = [
  { value: "dstv", label: "DSTV", icon: "tv" },
  { value: "gotv", label: "GOTV", icon: "tv" },
  { value: "startimes", label: "Startimes", icon: "tv" },
];

export const CABLE_PLANS: Record<string, Array<{ id: string; name: string; price: number; code: string }>> = {
  dstv: [
    { id: "90", name: "Padi", price: 4400, code: "dstv-padi" },
    { id: "91", name: "Yanga", price: 6000, code: "dstv-yanga" },
  ],
  gotv: [
    { id: "94", name: "Smallie", price: 1900, code: "gotv-smallie" },
  ],
  startimes: [
    { id: "101", name: "Basic", price: 4000, code: "startimes-basic" },
  ],
};

export const ELECTRICITY_PROVIDERS = [
  { value: "1", label: "Ikeja Electric (IKEDC)", code: "ikeja" },
  { value: "2", label: "Eko Electric (EKEDC)", code: "eko" },
];
