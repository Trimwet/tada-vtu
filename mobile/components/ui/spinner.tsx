import { ActivityIndicator } from 'react-native';

export type SpinnerVariant = 'default' | 'dots';

interface ButtonSpinnerProps {
  size?: string;
  variant?: SpinnerVariant;
  color?: string;
}

export function ButtonSpinner({ color = '#ffffff' }: ButtonSpinnerProps) {
  return <ActivityIndicator color={color} />;
}
