// Pure-data constants shared between web and mobile.
// No React/DOM/Next.js dependencies — safe for any runtime.

export const NETWORKS: Array<{ value: string; label: string; color: string }> = [
  { value: "MTN", label: "MTN", color: "#FFCC00" },
  { value: "AIRTEL", label: "Airtel", color: "#ED1C24" },
  { value: "GLO", label: "Glo", color: "#00A95C" },
  { value: "9MOBILE", label: "9Mobile", color: "#006C35" },
];

export const SERVICE_TYPES = [
  { value: "airtime", label: "Airtime", icon: "Phone" },
  { value: "data", label: "Data", icon: "Wifi" },
];

export const ELECTRICITY_PROVIDERS = [
  { value: "1", label: "Ikeja Electric (IKEDC)", code: "ikeja" },
  { value: "2", label: "Eko Electric (EKEDC)", code: "eko" },
];
