import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <View className="flex-1 px-6">
        <View className="flex-1 items-center justify-center">
          <Image
            source={require('../assets/splash-icon.png')}
            style={{ width: 64, height: 64, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 36, color: '#ffffff', letterSpacing: -0.5, marginBottom: 8 }}>
            TADAPAY
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#71717a', textAlign: 'center' }}>
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
