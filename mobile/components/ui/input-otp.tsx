import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, FONT_SIZE } from '@/theme/globals';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  TextInput,
  TextInputKeyPressEventData,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export interface InputOTPProps
  extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  length?: number;
  value?: string;
  onChangeText?: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  slotStyle?: ViewStyle;
  errorStyle?: TextStyle;
  masked?: boolean;
  showCursor?: boolean;
}

export interface InputOTPRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
}

export const InputOTP = forwardRef<InputOTPRef, InputOTPProps>(
  (
    {
      length = 6,
      value = '',
      onChangeText,
      onComplete,
      error,
      disabled = false,
      containerStyle,
      slotStyle,
      errorStyle,
      masked = false,
      showCursor = true,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const cardColor = useColor('card');
    const textColor = useColor('text');
    const mutedColor = useColor('textMuted');
    const borderColor = useColor('border');
    const primaryColor = useColor('primary');
    const dangerColor = useColor('destructive');

    const normalizedValue = value.slice(0, length);
    const currentActiveIndex = Math.min(normalizedValue.length, length - 1);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => {
        onChangeText?.('');
      },
      getValue: () => normalizedValue,
    }));

    const handleChangeText = useCallback(
      (text: string) => {
        const cleanText = text.replace(/[^0-9]/g, '').slice(0, length);
        onChangeText?.(cleanText);
        if (cleanText.length === length) {
          onComplete?.(cleanText);
        }
      },
      [length, onChangeText, onComplete]
    );

    const handleKeyPress = useCallback(
      (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        if (e.nativeEvent.key === 'Backspace' && normalizedValue.length > 0) {
          onChangeText?.(normalizedValue.slice(0, -1));
        }
      },
      [normalizedValue, onChangeText]
    );

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const handleSlotPress = useCallback(() => {
      if (!disabled) {
        inputRef.current?.focus();
      }
    }, [disabled]);

    const slots = Array.from({ length }, (_, index) => {
      const hasValue = index < normalizedValue.length;
      const isActive = isFocused && index === currentActiveIndex;
      const displayValue = hasValue
        ? masked
          ? '\u2022'
          : normalizedValue[index]
        : '';

      return (
        <React.Fragment key={index}>
          <Pressable
            onPress={handleSlotPress}
            disabled={disabled}
            style={[
              {
                width: 64,
                height: 64,
                borderRadius: BORDER_RADIUS,
                borderWidth: 1,
                borderColor: error
                  ? dangerColor
                  : isActive
                  ? primaryColor
                  : borderColor,
                backgroundColor: disabled ? mutedColor + '20' : cardColor,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: disabled ? 0.6 : 1,
              },
              slotStyle,
            ]}
          >
            <Animated.Text
              style={{
                fontSize: FONT_SIZE + 2,
                fontWeight: '600',
                color: error ? dangerColor : hasValue ? textColor : mutedColor,
              }}
            >
              {displayValue}
            </Animated.Text>

            {showCursor && isActive && !hasValue && (
              <View
                style={{
                  position: 'absolute',
                  width: 2,
                  height: 20,
                  backgroundColor: primaryColor,
                  opacity: isFocused ? 1 : 0,
                }}
              />
            )}
          </Pressable>
        </React.Fragment>
      );
    });

    return (
      <View style={containerStyle}>
        <TextInput
          ref={inputRef}
          value={normalizedValue}
          onChangeText={handleChangeText}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="numeric"
          maxLength={length}
          editable={!disabled}
          selectionColor="transparent"
          style={{ position: 'absolute', left: -9999, opacity: 0 }}
          {...textInputProps}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {slots}
        </View>

        {error && (
          <Animated.Text
            style={[
              {
                textAlign: 'center',
                marginTop: 8,
                fontSize: 14,
                color: dangerColor,
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

InputOTP.displayName = 'InputOTP';
