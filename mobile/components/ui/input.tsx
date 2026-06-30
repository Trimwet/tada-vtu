import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, FONT_SIZE, HEIGHT } from '@/theme/globals';
import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const cardColor = useColor('card');
    const textColor = useColor('text');
    const mutedColor = useColor('textMuted');
    const primaryColor = useColor('primary');
    const dangerColor = useColor('destructive');

    const borderColor = useSharedValue('#27272A');

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: borderColor.value,
    }));

    const handleFocus = (e: any) => {
      setIsFocused(true);
      borderColor.value = withTiming(primaryColor, { duration: 150 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      borderColor.value = withTiming(error ? dangerColor : '#27272A', { duration: 150 });
      onBlur?.(e);
    };

    return (
      <View style={[{ marginBottom: 16 }, containerStyle]}>
        {label && (
          <Animated.Text
            style={[
              {
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: error ? dangerColor : mutedColor,
                marginBottom: 8,
              },
              labelStyle,
            ]}
          >
            {label}
          </Animated.Text>
        )}
        <Animated.View
          style={[
            {
              backgroundColor: cardColor,
              borderWidth: 1,
              borderRadius: BORDER_RADIUS,
              paddingHorizontal: 16,
              height: HEIGHT,
              justifyContent: 'center',
            },
            animatedBorderStyle,
          ]}
        >
          <TextInput
            ref={ref}
            style={[
              {
                fontFamily: 'Inter_400Regular',
                fontSize: FONT_SIZE,
                color: textColor,
                paddingVertical: 0,
              },
              inputStyle,
            ]}
            placeholderTextColor={mutedColor}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!props.disabled}
            {...props}
          />
        </Animated.View>
        {error && (
          <Animated.Text
            style={[
              {
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: dangerColor,
                marginTop: 4,
              },
              errorStyle,
            ]}
          >
            {error}
          </Animated.Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
