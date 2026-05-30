import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { percent } from '@/utils/percentages';

export function ReviewScreen() {
  const summary = useQuery({ queryKey: ['statsSummary'], queryFn: endpoints.stats.summary });

  return (
    <Screen>
      <Header title="Review" subtitle="Training stats and weakest lines." />
      {summary.isLoading ? <LoadingState label="Loading stats..." /> : null}
      {summary.error ? <ErrorState message={summary.error.message} onRetry={() => void summary.refetch()} /> : null}
      {summary.data ? (
        <View style={styles.metrics}>
          <Metric label="Courses" value={String(summary.data.totalCourses)} />
          <Metric label="Lines" value={String(summary.data.totalLines)} />
          <Metric label="Sessions" value={String(summary.data.totalSessions)} />
        </View>
      ) : null}
      {summary.data?.weakLines.map((line, index) => (
        <Card key={line.id} style={styles.card}>
          <Text style={styles.title}>#{index + 1} {line.name}</Text>
          <Text style={styles.meta}>Failure rate {percent(line.failureRate)}</Text>
          <View style={styles.row}>
            <Link href={`/lines/${line.id}/train`} asChild>
              <Button title="Train now" />
            </Link>
            <Link href={`/lines/${line.id}/edit`} asChild>
              <Button title="Edit" variant="secondary" />
            </Link>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '900',
  },
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
