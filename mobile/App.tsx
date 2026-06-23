import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { NETWORKS, SERVICE_TYPES } from '@tadapay/shared';

// This screen intentionally renders data pulled from @tadapay/shared —
// proof that the workspace link between mobile/ and packages/shared/
// is actually wired up, not just scaffolding.

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>TADAPAY</Text>
        <Text style={styles.tagline}>A money operating system</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>₦0.00</Text>
          <Text style={styles.balanceHint}>Wire this up to GET /ledger/balance</Text>
        </View>

        <Text style={styles.sectionTitle}>Networks (from @tadapay/shared)</Text>
        <FlatList
          data={NETWORKS}
          keyExtractor={(item) => item.value}
          numColumns={2}
          columnWrapperStyle={styles.networkRow}
          renderItem={({ item }) => (
            <View style={[styles.networkPill, { borderColor: item.color }]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.networkLabel}>{item.label}</Text>
            </View>
          )}
        />

        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.serviceList}>
          {SERVICE_TYPES.map((service) => (
            <View key={service.value} style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>{service.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#8A93A6',
    marginTop: 2,
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#151B2B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#232B3D',
  },
  balanceLabel: {
    color: '#8A93A6',
    fontSize: 13,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 4,
  },
  balanceHint: {
    color: '#4D5870',
    fontSize: 11,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  networkRow: {
    gap: 10,
    marginBottom: 10,
  },
  networkPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151B2B',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  serviceList: {
    marginTop: 4,
  },
  serviceRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2334',
  },
  serviceLabel: {
    color: '#C5CBD9',
    fontSize: 14,
  },
});
