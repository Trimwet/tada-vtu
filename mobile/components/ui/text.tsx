import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'default' | 'caption' | 'title';
}

export function Text({ variant = 'default', style, ...props }: TextProps) {
  const getFontFamily = () => {
    switch (variant) {
      case 'caption':
        return 'Inter_400Regular';
      case 'title':
        return 'Inter_800ExtraBold';
      default:
        return 'Inter_400Regular';
    }
  };

  return (
    <RNText
      style={[
        { fontFamily: getFontFamily(), fontSize: variant === 'caption' ? 12 : 14 },
        style,
      ]}
      {...props}
    />
  );
}
