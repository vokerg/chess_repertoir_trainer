import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export function ConfigurationScreen({ missing }: { missing: string[] }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MOBILE CONFIGURATION</Text>
        <Text style={styles.title}>Environment variables are missing.</Text>
        <Text style={styles.body}>
          Copy apps/mobile/.env.example to apps/mobile/.env and configure:
        </Text>
        {missing.map((name) => <Text key={name} style={styles.code}>{name}</Text>)}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5efe6' },
  card: { gap: 12, padding: 22, borderRadius: 16, backgroundColor: '#fffaf4' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#9b3d2f' },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800', color: '#2e241d' },
  body: { fontSize: 15, lineHeight: 22, color: '#5a4a3f' },
  code: { padding: 10, borderRadius: 8, overflow: 'hidden', fontFamily: 'monospace', backgroundColor: '#eee1d3', color: '#3c2f27' },
});
