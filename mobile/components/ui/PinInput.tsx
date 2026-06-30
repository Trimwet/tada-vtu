import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface PinInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  length?: number;
}

export default function PinInput({ label, value, onChangeText, error, length = 4 }: PinInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const cells = Array.from({ length }, (_, i) => i);

  return (
    <View className="mb-4">
      <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-zinc-400 text-sm mb-2">
        {label}
      </Text>
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View className="flex-row justify-center gap-3">
          {cells.map((i) => (
            <PinCell key={i} filled={i < value.length} active={focused && i === value.length} />
          ))}
        </View>
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute opacity-0"
        style={{ width: 1, height: 1 }}
      />
      {error ? (
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-red-400 text-xs mt-2 text-center">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PinCell({ filled, active }: { filled: boolean; active: boolean }) {
  const borderColor = useSharedValue(active ? '#22C55E' : '#27272A');

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-14 h-14 bg-zinc-900 border rounded-xl items-center justify-center"
    >
      {filled ? (
        <View className="w-3 h-3 bg-white rounded-full" />
      ) : null}
    </Animated.View>
  );
}
