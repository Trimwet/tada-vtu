import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/input';
import { InputOTP } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabase';
import { theme } from '@/theme/colors';
import { BACK_BUTTON_SIZE } from '@/theme/globals';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (pin.length !== 4) e.pin = 'PIN must be 4 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

    setLoading(false);
    if (error) {
      setServerError(error.message);
    } else {
      router.replace('/(app)/');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            style={{ width: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE, borderRadius: BACK_BUTTON_SIZE / 2, backgroundColor: theme.colors.input, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.textMuted} />
          </Pressable>

          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: theme.colors.foreground, marginBottom: 4 }}>
            Welcome Back
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted, marginBottom: 32 }}>
            Enter your credentials to continue
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: errors.pin ? theme.colors.destructive : theme.colors.textMuted, marginBottom: 12 }}>
              4-digit PIN
            </Text>
            <InputOTP
              length={4}
              value={pin}
              onChangeText={setPin}
              masked
              error={errors.pin}
            />
          </View>

          <Pressable style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.colors.primary }}>
              Forgot PIN?
            </Text>
          </Pressable>

          {serverError ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.destructive, marginBottom: 16, textAlign: 'center' }}>
              {serverError}
            </Text>
          ) : null}

          <Button label="Sign In" onPress={handleLogin} loading={loading} />

          <Pressable onPress={() => router.push('/(auth)/signup')} style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted }}>
              Don't have an account?{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.primary }}>
                Create one
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
