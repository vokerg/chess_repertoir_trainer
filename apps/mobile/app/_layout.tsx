import { Stack } from 'expo-router';
import { MobileErrorBoundary } from '../src/shell/MobileErrorBoundary';

export default function RootLayout() {
  return (
    <MobileErrorBoundary>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Mobile foundation' }} />
        <Stack.Screen name="training-lab" options={{ title: 'Local training' }} />
        <Stack.Screen name="board-lab" options={{ title: 'Chessground board lab' }} />
      </Stack>
    </MobileErrorBoundary>
  );
}
