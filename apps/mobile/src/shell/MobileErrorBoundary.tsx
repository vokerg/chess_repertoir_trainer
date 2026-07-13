import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { mobileLogger } from '../diagnostics/mobile-logger';

type MobileErrorBoundaryProps = {
  children: ReactNode;
};

type MobileErrorBoundaryState = {
  error: Error | null;
};

export class MobileErrorBoundary extends Component<
  MobileErrorBoundaryProps,
  MobileErrorBoundaryState
> {
  override state: MobileErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    mobileLogger.error('app-boundary', 'Unhandled React error', {
      error: error.message,
      componentStack: info.componentStack ?? null,
    });
  }

  private readonly reset = (): void => {
    mobileLogger.info('app-boundary', 'Error boundary reset');
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>MOBILE ERROR</Text>
          <Text style={styles.title}>The screen could not continue.</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5efe6' },
  card: { gap: 14, padding: 22, borderRadius: 16, backgroundColor: '#fffaf4' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#9b3d2f' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#2e241d' },
  message: { fontSize: 15, lineHeight: 22, color: '#5a4a3f' },
  button: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, backgroundColor: '#6b452d' },
  buttonText: { color: '#ffffff', fontWeight: '700' },
});
