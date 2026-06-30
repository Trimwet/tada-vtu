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

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (pin.length !== 4) e.pin = 'PIN must be 4 digits';
    if (pin !== confirmPin) e.confirmPin = 'PINs do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError('');

    const { error } = await supabase.auth.signUp({
      email,
      password: pin,
      options: { data: { full_name: fullName, phone } },
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
                Create Account
              </Text>
            </Pressable>

            <Text style={{ fontFamily: 'Inter_800ExtraBold' }} className="text-white text-2xl mb-1">
              Join TADAPAY
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-zinc-400 text-sm mb-8">
              Create your account to get started
            </Text>

            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              autoCapitalize="words"
              error={errors.fullName}
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="08012345678"
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <PinInput label="Create PIN" value={pin} onChangeText={setPin} error={errors.pin} />

            <PinInput label="Confirm PIN" value={confirmPin} onChangeText={setConfirmPin} error={errors.confirmPin} />

            {serverError ? (
              <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-red-400 text-sm mb-4 text-center">
                {serverError}
              </Text>
            ) : null}

            <View className="mt-2">
              <Button label="Create Account" onPress={handleSignup} loading={loading} />
            </View>

            <Pressable onPress={() => router.push('/(auth)/login')} className="mt-6 items-center">
              <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-zinc-400 text-sm">
                Already have an account?{' '}
                <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-primary">
                  Sign In
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
