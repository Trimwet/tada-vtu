import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#ffffff', fontSize: 16 }}>Home — coming soon</Text>
    </SafeAreaView>
  );
}
