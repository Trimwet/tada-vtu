import { theme } from '@/theme/colors';

type ColorKey = keyof typeof theme.colors;

export function useColor(key: ColorKey): string {
  return theme.colors[key];
}
