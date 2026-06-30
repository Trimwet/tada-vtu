import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: '100%',
  }));

  const handlePressIn = () => { scale.value = withTiming(0.97, { duration: 80 }); };
  const handlePressOut = () => { scale.value = withTiming(1, { duration: 80 }); };

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9999,
          paddingVertical: 16,
          paddingHorizontal: 24,
          backgroundColor: isPrimary ? '#22C55E' : 'transparent',
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: isPrimary ? 'transparent' : '#3f3f46',
          opacity: disabled ? 0.5 : 1,
        }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#a1a1aa'} />
      ) : (
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 16,
            color: isPrimary ? '#ffffff' : '#d4d4d8',
          }}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}
