import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { theme } from '@/theme/colors';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={require('../assets/splash-icon.png')}
            style={{ width: 64, height: 64, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 36, color: theme.colors.foreground, letterSpacing: -0.5, marginBottom: 8 }}>
            TADAPAY
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' }}>
            Fast, simple bill payments
          </Text>
        </View>

        <View style={{ paddingBottom: 16, gap: 12 }}>
          <Button label="Create Account" onPress={() => router.push('/(auth)/signup')} />
          <Button label="Sign In" variant="outline" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
