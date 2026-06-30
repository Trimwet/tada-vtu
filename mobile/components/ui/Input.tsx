import { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, style: _style, ...props }: InputProps) {
  const borderColor = useSharedValue('#27272A');

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = () => {
    borderColor.value = withTiming('#22C55E', { duration: 150 });
  };

  const handleBlur = () => {
    borderColor.value = withTiming(error ? '#F87171' : '#27272A', { duration: 150 });
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#a1a1aa', marginBottom: 8 }}>
        {label}
      </Text>
      <Animated.View
        style={[
          {
            backgroundColor: '#18181b',
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 16,
          },
          animatedBorderStyle,
        ]}
      >
        <TextInput
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#ffffff', paddingVertical: 14 }}
          placeholderTextColor="#52525B"
        />
      </Animated.View>
      {error ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#f87171', marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
