import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { messageFromUnknownError } from '@/api/errors';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCourses } from '@/features/library/hooks/useStudyLibrary';
import { CourseCard } from '../components/CourseCard';
import { spacing } from '@/theme/spacing';

export function CoursesScreen() {
  const courses = useCourses();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createCourse = useMutation({
    mutationFn: endpoints.courses.create,
    onSuccess: async () => {
      setName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error) => Alert.alert('Create failed', messageFromUnknownError(error)),
  });
  const deleteCourse = useMutation({
    mutationFn: endpoints.courses.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
    onError: (error) => Alert.alert('Delete failed', messageFromUnknownError(error)),
  });

  return (
    <Screen>
      <Header title="Courses" subtitle="Create and manage repertoires." />
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Sicilian repertoire" />
        <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Optional" />
        <Button
          title="Create course"
          disabled={!name.trim() || createCourse.isPending}
          onPress={() => createCourse.mutate({ name: name.trim(), description: description.trim() || null })}
        />
      </View>
      {courses.isLoading ? <LoadingState label="Loading courses..." /> : null}
      {courses.error ? <ErrorState message={courses.error.message} onRetry={() => void courses.refetch()} /> : null}
      {courses.data?.length === 0 ? <EmptyState title="No courses" /> : null}
      {courses.data?.map((course) => (
        <CourseCard key={course.id} course={course} onDelete={() => deleteCourse.mutate(course.id)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
