import { useColor } from '@/hooks/useColor';
import { CORNERS, FONT_SIZE, HEIGHT } from '@/theme/globals';
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'lg';

export interface ButtonProps {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      label,
      onPress,
      variant = 'default',
      size = 'default',
      disabled = false,
      loading = false,
      style,
      textStyle,
    },
    ref
  ) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withTiming(0.97, { duration: 80 });
    };

    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 80 });
    };

    const primaryColor = useColor('primary');
    const primaryFg = useColor('primaryForeground');
    const secondaryColor = useColor('secondary');
    const secondaryFg = useColor('secondaryForeground');
    const destructiveColor = useColor('destructive');
    const destructiveFg = useColor('destructiveForeground');
    const borderColor = useColor('border');

    const getButtonStyle = (): ViewStyle => {
      const base: ViewStyle = {
        borderRadius: CORNERS,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: HEIGHT,
        paddingHorizontal: 32,
      };

      if (size === 'sm') {
        base.height = 44;
        base.paddingHorizontal = 24;
      } else if (size === 'lg') {
        base.height = 54;
        base.paddingHorizontal = 36;
      }

      switch (variant) {
        case 'destructive':
          return { ...base, backgroundColor: destructiveColor };
        case 'outline':
          return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor };
        case 'secondary':
          return { ...base, backgroundColor: secondaryColor };
        case 'ghost':
          return { ...base, backgroundColor: 'transparent' };
        default:
          return { ...base, backgroundColor: primaryColor };
      }
    };

    const getTextColor = (): string => {
      switch (variant) {
        case 'destructive': return destructiveFg;
        case 'outline': return primaryColor;
        case 'secondary': return secondaryFg;
        case 'ghost': return primaryColor;
        default: return primaryFg;
      }
    };

    const content = label || children;

    return (
      <AnimatedPressable
        ref={ref}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, getButtonStyle(), disabled && { opacity: 0.5 }, style]}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : typeof content === 'string' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Animated.Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: FONT_SIZE,
                color: getTextColor(),
              }}
            >
              {content}
            </Animated.Text>
          </View>
        ) : (
          content
        )}
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';
