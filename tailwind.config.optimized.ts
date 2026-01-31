import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Optimized color palette for core services
      colors: {
        primary: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Remove unused color variants for smaller CSS
      },
      // Optimized animations for mobile performance
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-green': 'pulseGreen 2s infinite',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
  // Production optimizations
  corePlugins: {
    // Disable unused features for smaller bundle
    preflight: true,
    container: false, // We use custom containers
    accessibility: true,
  },
};

export default config;