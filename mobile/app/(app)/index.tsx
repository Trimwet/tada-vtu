import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A] items-center justify-center">
      <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-white text-lg">
        Home — coming soon
      </Text>
    </SafeAreaView>
  );
}
