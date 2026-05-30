import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/api/queryClient';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="courses/index" options={{ title: 'Courses' }} />
          <Stack.Screen name="courses/[courseId]" options={{ title: 'Course detail' }} />
          <Stack.Screen name="chapters/[chapterId]/lines" options={{ title: 'Lines' }} />
          <Stack.Screen name="lines/[lineId]/edit" options={{ title: 'Edit line' }} />
          <Stack.Screen name="lines/[lineId]/train" options={{ title: 'Train line' }} />
          <Stack.Screen name="games/[gameId]" options={{ title: 'Game replay' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
