const brand = {
  100: '#CEFFEF', 200: '#B2FFE6', 300: '#00FACD', 400: '#00E6BA', 500: '#00CEA8',
  600: '#00BA97', 700: '#00A385', 800: '#009477', 900: '#007E66', 1000: '#00493A',
};
const sand = { light: '#E7E7CB', DEFAULT: '#D7D7A8', dark: '#979776' };
const neutral = {
  0: '#FFFFFF', 50: '#d4d4d8', 100: '#a1a1aa', 200: '#71717a', 300: '#52525B',
  400: '#3f3f46', 500: '#27272A', 600: '#18181b', 950: '#0A0A0A',
};

export const error = '#EF4444';
export const success = '#2563EB';
export const warning = '#F59E0B';

export const theme = {
  colors: {
    background: neutral[950],
    foreground: neutral[0],
    card: neutral[600],
    cardForeground: neutral[0],
    popover: neutral[600],
    popoverForeground: neutral[0],
    primary: brand[700],
    primaryForeground: neutral[0],
    secondary: neutral[500],
    secondaryForeground: neutral[50],
    muted: neutral[500],
    mutedForeground: neutral[100],
    accent: neutral[500],
    accentForeground: neutral[0],
    destructive: error,
    destructiveForeground: neutral[0],
    border: neutral[500],
    input: neutral[600],
    ring: brand[700],
    text: neutral[0],
    textMuted: neutral[100],
  },
};

export { brand, sand, neutral };
