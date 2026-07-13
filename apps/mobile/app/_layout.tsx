import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { MobileSessionProvider } from '../src/auth/MobileSessionProvider';
import { missingMobileConfiguration, mobileConfig } from '../src/config/mobile-config';
import { migrateMobileDatabase, MOBILE_DATABASE_NAME } from '../src/db/database';
import { ConfigurationScreen } from '../src/shell/ConfigurationScreen';
import { MobileErrorBoundary } from '../src/shell/MobileErrorBoundary';
import { AttemptSyncProvider } from '../src/sync/AttemptSyncProvider';

export default function RootLayout() {
  const missingConfiguration = missingMobileConfiguration();
  if (missingConfiguration.length > 0) {
    return (
      <MobileErrorBoundary>
        <ConfigurationScreen missing={missingConfiguration} />
      </MobileErrorBoundary>
    );
  }

  return (
    <SafeAreaProvider>
      <MobileErrorBoundary>
        <ClerkProvider publishableKey={mobileConfig.clerkPublishableKey} tokenCache={tokenCache}>
          <Suspense fallback={<DatabaseLoadingScreen />}>
            <SQLiteProvider
              databaseName={MOBILE_DATABASE_NAME}
              onInit={migrateMobileDatabase}
              useSuspense
            >
              <MobileSessionProvider>
                <AttemptSyncProvider>
                  <StatusBar style="auto" />
                  <Stack>
                    <Stack.Screen name="index" options={{ title: 'Offline courses' }} />
                    <Stack.Screen name="courses/[courseId]" options={{ title: 'Downloaded course' }} />
                    <Stack.Screen name="training/[lineId]" options={{ title: 'Offline training' }} />
                    <Stack.Screen name="training/marathon" options={{ title: 'Offline marathon' }} />
                    <Stack.Screen name="(auth)/sign-in" options={{ title: 'Sign in', presentation: 'modal' }} />
                    <Stack.Screen name="training-lab" options={{ title: 'Local training lab' }} />
                    <Stack.Screen name="board-lab" options={{ title: 'Chessground board lab' }} />
                  </Stack>
                </AttemptSyncProvider>
              </MobileSessionProvider>
            </SQLiteProvider>
          </Suspense>
        </ClerkProvider>
      </MobileErrorBoundary>
    </SafeAreaProvider>
  );
}

function DatabaseLoadingScreen() {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator />
      <Text style={styles.loadingText}>Preparing offline storage…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#f5efe6' },
  loadingText: { color: '#5a4a3f' },
});
