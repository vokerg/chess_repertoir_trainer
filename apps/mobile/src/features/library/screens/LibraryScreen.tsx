import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { messageFromUnknownError } from '@/api/errors';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { LineCard } from '../components/LineCard';
import { useChapters, useCourses, useCourseStats, useLines } from '../hooks/useStudyLibrary';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { lineStatus } from '@/utils/lineStatus';

export function LibraryScreen() {
  const courses = useCourses();
  const [search, setSearch] = useState('');
  const [needsReview, setNeedsReview] = useState(false);

  return (
    <Screen>
      <Header title="Study" subtitle="Browse repertoires, train lines, and keep weak spots visible." />
      <View style={styles.row}>
        <Link href="/courses" asChild>
          <Button title="Manage courses" variant="secondary" />
        </Link>
        <Button
          title={needsReview ? 'All lines' : 'Needs review'}
          variant={needsReview ? 'primary' : 'secondary'}
          onPress={() => setNeedsReview((value) => !value)}
        />
      </View>
      <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Course, chapter, line, side, FEN" />
      {courses.isLoading ? <LoadingState label="Loading study library..." /> : null}
      {courses.error ? <ErrorState message={courses.error.message} onRetry={() => void courses.refetch()} /> : null}
      {courses.data?.length === 0 ? <EmptyState title="No courses yet" message="Create a course to start building your repertoire." /> : null}
      {courses.data?.map((course) => (
        <StudyCourse key={course.id} courseId={course.id} search={search} needsReview={needsReview} name={course.name} description={course.description} />
      ))}
    </Screen>
  );
}

function StudyCourse({
  courseId,
  name,
  description,
  search,
  needsReview,
}: {
  courseId: number;
  name: string;
  description?: string | null;
  search: string;
  needsReview: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const stats = useCourseStats(courseId);
  const chapters = useChapters(courseId);

  return (
    <Card style={styles.course}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)} style={styles.courseHeader}>
        <View style={styles.grow}>
          <Text style={styles.courseName}>{name}</Text>
          {description ? <Text style={styles.muted}>{description}</Text> : null}
          {stats.data ? <Text style={styles.muted}>{stats.data.activeSublineCount} active sublines · {stats.data.totalAttempts} recent attempts</Text> : null}
        </View>
        <Text style={styles.expand}>{expanded ? 'Close' : 'Open'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.stack}>
          {chapters.data?.map((chapter) => (
            <StudyChapter key={chapter.id} chapterId={chapter.id} name={chapter.name} search={search} needsReview={needsReview} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function StudyChapter({ chapterId, name, search, needsReview }: { chapterId: number; name: string; search: string; needsReview: boolean }) {
  const lines = useLines(chapterId);
  const queryClient = useQueryClient();
  const deleteLine = useMutation({
    mutationFn: endpoints.lines.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lines', chapterId] }),
  });

  const visibleLines = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (lines.data ?? []).filter((line) => {
      const haystack = `${line.name} ${line.sideToTrain} ${line.startingFen} ${lineStatus(line)}`.toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesReview = !needsReview || ['WEAK', 'REVIEW', 'NEW'].includes(lineStatus(line));
      return matchesSearch && matchesReview;
    });
  }, [lines.data, needsReview, search]);

  async function exportPgn(lineId: number): Promise<void> {
    try {
      const result = await endpoints.lines.exportPgn(lineId);
      await Clipboard.setStringAsync(typeof result === 'string' ? result : result.pgn ?? '');
      Alert.alert('PGN copied');
    } catch (error) {
      Alert.alert('Export failed', messageFromUnknownError(error));
    }
  }

  if (visibleLines.length === 0 && (search || needsReview)) return null;

  return (
    <View style={styles.stack}>
      <Text style={styles.chapterName}>{name}</Text>
      {lines.isLoading ? <LoadingState label="Loading lines..." /> : null}
      {visibleLines.map((line) => (
        <LineCard
          key={line.id}
          line={line}
          onExport={() => void exportPgn(line.id)}
          onDelete={() => deleteLine.mutate(line.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  course: {
    gap: spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  courseName: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  chapterName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  muted: {
    color: colors.muted,
  },
  expand: {
    color: colors.accent,
    fontWeight: '800',
  },
  stack: {
    gap: spacing.md,
  },
});
