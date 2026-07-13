import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function MobileHomeRoute() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>PHASE 1 FOUNDATION</Text>
        <Text style={styles.title}>Chess Repertoire Trainer</Text>
        <Text style={styles.body}>
          The supported Expo client now includes the production Chessground adapter, a replayable shared training reducer, versioned mobile contracts, diagnostics, and a complete local training proof.
        </Text>
        <Link href="/training-lab" style={styles.primaryLink}>
          Train the local Ruy Lopez line
        </Link>
        <Link href="/board-lab" style={styles.secondaryLink}>
          Open Chessground diagnostics
        </Link>
        <Text style={styles.note}>
          Authentication, SQLite downloads, durable persistence, and synchronization remain later rollout phases.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  content: { flex: 1, justifyContent: 'center', gap: 16, padding: 28 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: '#6f513b' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#2e241d' },
  body: { fontSize: 17, lineHeight: 25, color: '#5a4a3f' },
  primaryLink: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: '#6b452d', color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryLink: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e2d2c1', color: '#3c2f27', fontSize: 16, fontWeight: '700' },
  note: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#76675c' },
});
