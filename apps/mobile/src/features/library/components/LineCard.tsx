import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LineDto } from '@/api/dto';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { lineStatus } from '@/utils/lineStatus';

export function LineCard({ line, onDelete, onExport }: { line: LineDto; onDelete?: () => void; onExport?: () => void }) {
  const status = lineStatus(line);
  return (
    <Card style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.textWrap}>
          <Text style={styles.name}>{line.name}</Text>
          <Text style={styles.meta}>
            Train as {line.sideToTrain === 'WHITE' ? 'White' : 'Black'} · {line.startingFen === 'startpos' ? 'startpos' : 'custom FEN'}
          </Text>
          <Text style={styles.meta}>
            {line.totalAttempts ?? 0} attempts · {line.passedCount ?? 0} passed · {line.failedCount ?? 0} failed
          </Text>
        </View>
        <Pill label={status} tone={status === 'WEAK' ? 'danger' : status === 'CLEAN' ? 'success' : 'neutral'} />
      </View>
      <View style={styles.actions}>
        <Link href={`/lines/${line.id}/train`} asChild>
          <Button title="Train" />
        </Link>
        <Link href={`/lines/${line.id}/edit`} asChild>
          <Button title="Edit" variant="secondary" />
        </Link>
        {onExport ? <Button title="PGN" variant="secondary" onPress={onExport} /> : null}
        {onDelete ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
