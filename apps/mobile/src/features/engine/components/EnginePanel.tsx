import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { usePositionAnalysis, scoreFromWhiteToSideToMove } from '../hooks/usePositionAnalysis';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function EnginePanel({ fen, enabled = false }: { fen: string; enabled?: boolean }) {
  const query = usePositionAnalysis(fen, { enabled });
  const lines = query.data?.position.lines ?? [];

  return (
    <Card style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Engine</Text>
        <Button title="Analyse" variant="secondary" onPress={() => void query.refetch()} />
      </View>
      {query.isLoading ? <LoadingState label="Analysing position..." /> : null}
      {query.error ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {lines.map((line, index) => {
        const score = scoreFromWhiteToSideToMove(line.scoreCp ?? undefined, fen);
        return (
          <View key={`${line.multipv ?? index}-${line.bestMove ?? 'line'}`} style={styles.line}>
            <Text style={styles.move}>{line.bestMove ?? 'No move'}</Text>
            <Text style={styles.meta}>
              {line.mate ? `Mate ${line.mate}` : typeof score === 'number' ? `${(score / 100).toFixed(2)}` : '0.00'}
            </Text>
            <Text style={styles.pv}>{line.pv?.join(' ') ?? ''}</Text>
          </View>
        );
      })}
      {query.data?.position.fromCache ? <Text style={styles.cache}>From backend cache</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
  },
  line: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  move: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  meta: {
    color: colors.accent,
    fontWeight: '800',
  },
  pv: {
    color: colors.muted,
  },
  cache: {
    color: colors.muted,
    fontSize: typography.small,
  },
});
