import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import PinInput from '../../components/ui/PinInput';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

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
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow px-6 pt-4 pb-8" keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(400)}>
            <Pressable onPress={() => router.back()} className="flex-row items-center mb-6">
              <Ionicons name="arrow-back" size={24} color="#a1a1aa" />
              <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-zinc-300 text-lg ml-3">
                Welcome Back
              </Text>
            </Pressable>

            <Text style={{ fontFamily: 'Inter_800ExtraBold' }} className="text-white text-2xl mb-1">
              Sign In
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-zinc-400 text-sm mb-8">
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

            <PinInput label="PIN" value={pin} onChangeText={setPin} error={errors.pin} />

            <Pressable className="self-end mb-6">
              <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-primary text-sm">
                Forgot PIN?
              </Text>
            </Pressable>

            {serverError ? (
              <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-red-400 text-sm mb-4 text-center">
                {serverError}
              </Text>
            ) : null}

            <Button label="Sign In" onPress={handleLogin} loading={loading} />

            <Pressable onPress={() => router.push('/(auth)/signup')} className="mt-6 items-center">
              <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-zinc-400 text-sm">
                Don't have an account?{' '}
                <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-primary">
                  Create one
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
