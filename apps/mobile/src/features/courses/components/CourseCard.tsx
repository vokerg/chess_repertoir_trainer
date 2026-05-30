import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { CourseDto, CourseStatsDto } from '@/api/dto';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function CourseCard({
  course,
  stats,
  onDelete,
}: {
  course: CourseDto;
  stats?: CourseStatsDto;
  onDelete?: () => void;
}) {
  return (
    <Card style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.textWrap}>
          <Text style={styles.name}>{course.name}</Text>
          {course.description ? <Text style={styles.description}>{course.description}</Text> : null}
          {stats ? <Text style={styles.meta}>{stats.totalLines} lines · {Math.round(stats.passRate ?? 0)}% pass</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Link href={`/courses/${course.id}`} asChild>
          <Button title="Open" variant="secondary" />
        </Link>
        {onDelete ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  description: {
    color: colors.muted,
    fontSize: typography.body,
  },
  meta: {
    color: colors.muted,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
