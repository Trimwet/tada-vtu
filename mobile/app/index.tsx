import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Button from '../components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <LinearGradient
        colors={['#052e16', '#0A0A0A']}
        className="flex-1 items-center justify-center px-6"
      >
        <Animated.View entering={FadeIn.duration(600)} className="items-center mb-16">
          <Image
            source={require('../assets/splash-icon.png')}
            className="w-20 h-20 mb-6"
            resizeMode="contain"
          />
          <Text style={{ fontFamily: 'Inter_800ExtraBold' }} className="text-white text-4xl mb-2">
            TADAPAY
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-zinc-400 text-base text-center">
            Fast, simple bill payments
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} className="w-full gap-3">
          <Button label="Create Account" onPress={() => router.push('/(auth)/signup')} />
          <Button label="Sign In" variant="outline" onPress={() => router.push('/(auth)/login')} />
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}
