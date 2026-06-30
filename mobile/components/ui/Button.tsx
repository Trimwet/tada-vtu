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
  }));

  const handlePressIn = () => { scale.value = withTiming(0.96, { duration: 100 }); };
  const handlePressOut = () => { scale.value = withTiming(1, { duration: 100 }); };

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={animatedStyle}
      className={`flex-row items-center justify-center rounded-xl py-4 px-6 ${
        isPrimary ? 'bg-primary' : 'border border-zinc-700 bg-transparent'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#a1a1aa'} />
      ) : (
        <Text
          style={{ fontFamily: 'Inter_600SemiBold' }}
          className={`text-base ${isPrimary ? 'text-white' : 'text-zinc-300'}`}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}
