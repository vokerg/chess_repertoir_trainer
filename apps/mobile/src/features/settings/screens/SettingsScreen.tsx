import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { testHealth } from '@/api/apiClient';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { getApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from '@/storage/settingsStore';

export function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [health, setHealth] = useState<string | null>(null);

  useEffect(() => {
    void getApiBaseUrl().then(setApiUrl);
  }, []);

  async function save(): Promise<void> {
    await setApiBaseUrl(apiUrl);
    Alert.alert('Settings saved');
  }

  async function reset(): Promise<void> {
    const value = await resetApiBaseUrl();
    setApiUrl(value);
  }

  async function checkHealth(): Promise<void> {
    const result = await testHealth(apiUrl);
    setHealth(`${result.ok ? 'OK' : 'Failed'} ${result.body}`);
  }

  return (
    <Screen>
      <Header title="Settings" subtitle="Configure backend connectivity and build information." />
      <Card style={styles.card}>
        <Text style={styles.title}>API</Text>
        <TextField label="API base URL" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" autoCorrect={false} />
        <View style={styles.row}>
          <Button title="Save" onPress={() => void save()} />
          <Button title="Reset" variant="secondary" onPress={() => void reset()} />
          <Button title="Test" variant="secondary" onPress={() => void checkHealth()} />
        </View>
        {health ? <Text style={styles.meta}>{health}</Text> : null}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.title}>Build</Text>
        <Text style={styles.meta}>Version {Constants.expoConfig?.version ?? '0.1.0'}</Text>
        <Text style={styles.meta}>Environment {__DEV__ ? 'development' : 'production'}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meta: {
    color: colors.muted,
  },
});
