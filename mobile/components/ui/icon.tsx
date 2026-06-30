import { LucideProps } from 'lucide-react-native';
import React from 'react';

interface IconProps {
  name: React.ComponentType<LucideProps>;
  size?: number;
  color?: string;
}

export function Icon({ name: IconComponent, size = 18, color }: IconProps) {
  return <IconComponent size={size} color={color} />;
}
