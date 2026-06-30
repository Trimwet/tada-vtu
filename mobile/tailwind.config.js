/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 content scanning
  content: [
    "./App.{js,ts,jsx,tsx}",
    "./index.{js,ts}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Exact same brand colors as tadavtu.com
        primary: "#22c55e",       // green-500
        "primary-dark": "#16a34a", // green-600
        "primary-dim": "rgba(34,197,94,0.1)",
        surface: "#0c0a09",       // near-black card bg
        card: "rgba(255,255,255,0.03)",
        border: "rgba(255,255,255,0.10)",
        muted: "#71717a",         // gray-500
        "muted-foreground": "#a1a1aa",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "system-ui"],
        medium: ["Inter_500Medium", "system-ui"],
        semibold: ["Inter_600SemiBold", "system-ui"],
        bold: ["Inter_700Bold", "system-ui"],
      },
    },
  },
  plugins: [],
};
