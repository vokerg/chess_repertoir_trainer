import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type PillTone = 'neutral' | 'success' | 'warning' | 'danger';

type PillProps = {
  label: string;
  tone?: PillTone;
};

export function Pill({ label, tone = 'neutral' }: PillProps) {
  return <Text style={[styles.pill, styles[tone]]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.text,
  },
  neutral: {
    backgroundColor: colors.accentSoft,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
});
