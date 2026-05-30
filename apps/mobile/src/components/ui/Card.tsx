import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
});
