import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
}>;

export function Screen({ children, scroll = true, style }: ScreenProps) {
  if (!scroll) {
    return <SafeAreaView style={[styles.safe, style]}>{children}</SafeAreaView>;
  }
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
