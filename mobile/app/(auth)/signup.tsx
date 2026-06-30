import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#a1a1aa" />
          </Pressable>

          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: '#ffffff', marginBottom: 4 }}>
            Create Account
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#a1a1aa', marginBottom: 32 }}>
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
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#f87171', marginBottom: 16, textAlign: 'center' }}>
              {serverError}
            </Text>
          ) : null}

          <Button label="Create Account" onPress={handleSignup} loading={loading} />

          <Pressable onPress={() => router.push('/(auth)/login')} style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#a1a1aa' }}>
              Already have an account?{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#22C55E' }}>
                Sign In
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
