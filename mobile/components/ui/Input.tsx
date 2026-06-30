import { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue('#27272A');

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = () => {
    setFocused(true);
    borderColor.value = withTiming('#22C55E', { duration: 150 });
  };

  const handleBlur = () => {
    setFocused(false);
    borderColor.value = withTiming(error ? '#F87171' : '#27272A', { duration: 150 });
  };

  return (
    <View className="mb-4">
      <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-zinc-400 text-sm mb-2">
        {label}
      </Text>
      <Animated.View style={animatedStyle} className="bg-zinc-900 border rounded-xl px-4">
        <TextInput
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ fontFamily: 'Inter_400Regular' }}
          className="text-white text-base py-4"
          placeholderTextColor="#52525B"
        />
      </Animated.View>
      {error ? (
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-red-400 text-xs mt-1">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
