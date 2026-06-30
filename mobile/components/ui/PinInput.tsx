import { useRef, useState, useEffect } from 'react';
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

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
        {label}
      </Text>
      <Pressable onPress={() => inputRef.current?.focus()} style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length }, (_, i) => (
          <PinCell
            key={i}
            filled={i < value.length}
            active={focused && i === value.length}
          />
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      {error ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#f87171', marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PinCell({ filled, active }: { filled: boolean; active: boolean }) {
  const borderColor = useSharedValue(active ? '#22C55E' : '#27272A');

  useEffect(() => {
    borderColor.value = withTiming(active ? '#22C55E' : '#27272A', { duration: 150 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          aspectRatio: 1,
          maxWidth: 64,
          backgroundColor: '#18181b',
          borderWidth: 1,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      {filled ? (
        <View style={{ width: 10, height: 10, backgroundColor: '#ffffff', borderRadius: 5 }} />
      ) : null}
    </Animated.View>
  );
}
