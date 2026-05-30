import { StyleSheet, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { uciToSan } from '@/utils/chess';

export function ExpectedMoveCard({ fen, expectedMoveUci, visible }: { fen: string; expectedMoveUci?: string | null; visible: boolean }) {
  if (!visible) return null;
  return (
    <Card style={styles.wrap}>
      <Text style={styles.title}>Expected move</Text>
      <Text style={styles.move}>{uciToSan(fen, expectedMoveUci) ?? expectedMoveUci ?? 'No move'}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  title: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  move: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '900',
  },
});
