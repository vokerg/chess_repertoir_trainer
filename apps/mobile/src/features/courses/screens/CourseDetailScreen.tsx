import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { messageFromUnknownError } from '@/api/errors';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { useChapters, useCourseStats } from '@/features/library/hooks/useStudyLibrary';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function CourseDetailScreen() {
  const params = useLocalSearchParams<{ courseId: string }>();
  const courseId = Number(params.courseId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const course = useQuery({ queryKey: ['course', courseId], queryFn: () => endpoints.courses.get(courseId), enabled: courseId > 0 });
  const stats = useCourseStats(courseId);
  const chapters = useChapters(courseId);
  const [chapterName, setChapterName] = useState('');

  const updateCourse = useMutation({
    mutationFn: (name: string) => endpoints.courses.update(courseId, { name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
  const deleteCourse = useMutation({
    mutationFn: () => endpoints.courses.delete(courseId),
    onSuccess: () => router.back(),
  });
  const createChapter = useMutation({
    mutationFn: () => endpoints.courses.createChapter(courseId, { name: chapterName.trim(), description: null }),
    onSuccess: async () => {
      setChapterName('');
      await queryClient.invalidateQueries({ queryKey: ['chapters', courseId] });
    },
    onError: (error) => Alert.alert('Chapter failed', messageFromUnknownError(error)),
  });
  const deleteChapter = useMutation({
    mutationFn: endpoints.chapters.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters', courseId] }),
  });

  if (course.isLoading) return <Screen><LoadingState label="Loading course..." /></Screen>;
  if (course.error) return <Screen><ErrorState message={course.error.message} onRetry={() => void course.refetch()} /></Screen>;

  return (
    <Screen>
      <Header title={course.data?.name ?? 'Course'} subtitle={course.data?.description} />
      {stats.data ? (
        <View style={styles.metrics}>
          <Metric label="Active sublines" value={String(stats.data.activeSublineCount)} />
          <Metric label="Recent attempts" value={String(stats.data.totalAttempts)} />
          <Metric label="Pass rate" value={`${Math.round(stats.data.passRate ?? 0)}%`} />
        </View>
      ) : null}
      <View style={styles.row}>
        <Button title="Rename" variant="secondary" onPress={() => updateCourse.mutate(`${course.data?.name ?? 'Course'}*`)} />
        <Button title="Delete course" variant="danger" onPress={() => deleteCourse.mutate()} />
      </View>
      <Card style={styles.form}>
        <Text style={styles.sectionTitle}>New chapter</Text>
        <TextField label="Name" value={chapterName} onChangeText={setChapterName} placeholder="Chapter name" />
        <Button title="Create chapter" disabled={!chapterName.trim()} onPress={() => createChapter.mutate()} />
      </Card>
      {chapters.data?.map((chapter) => (
        <Card key={chapter.id} style={styles.form}>
          <Text style={styles.chapter}>{chapter.name}</Text>
          {chapter.description ? <Text style={styles.muted}>{chapter.description}</Text> : null}
          <View style={styles.row}>
            <Link href={`/chapters/${chapter.id}/lines`} asChild>
              <Button title="Lines" variant="secondary" />
            </Link>
            <Button title="Delete" variant="danger" onPress={() => deleteChapter.mutate(chapter.id)} />
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
      <Text style={styles.muted}>{label}</Text>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  chapter: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  muted: {
    color: colors.muted,
  },
});
