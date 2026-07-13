import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useMobileSession } from '../../auth/MobileSessionProvider';
import {
  loadLocalCourseHierarchy,
  type LocalCourseHierarchy,
} from '../../db/repositories/course-content.repository';
import { mobileLogger } from '../../diagnostics/mobile-logger';

export function CourseDetailScreen() {
  const { courseId: rawCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const courseId = Number(rawCourseId);
  const db = useSQLiteContext();
  const session = useMobileSession();
  const [course, setCourse] = useState<LocalCourseHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.activeUser || !Number.isSafeInteger(courseId) || courseId < 1) {
      setLoading(false);
      setCourse(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadLocalCourseHierarchy(db, session.activeUser.appUserId, courseId)
      .then((value) => {
        if (!cancelled) setCourse(value);
      })
      .catch((caught: unknown) => {
        mobileLogger.error('course-detail', 'Could not load downloaded course', caught);
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Course could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, db, session.activeUser]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.meta}>Opening downloaded course…</Text>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Course unavailable</Text>
        <Text style={styles.meta}>{error ?? 'Download the course before opening it offline.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DOWNLOADED REVISION {course.contentRevision}</Text>
        <Text style={styles.title}>{course.name}</Text>
        {course.description ? <Text style={styles.description}>{course.description}</Text> : null}
        {course.chapters.length === 0 ? (
          <Text style={styles.meta}>This course has no chapters.</Text>
        ) : course.chapters.map((chapter) => (
          <View key={chapter.id} style={styles.chapterCard}>
            <Text style={styles.chapterName}>{chapter.name}</Text>
            {chapter.description ? <Text style={styles.description}>{chapter.description}</Text> : null}
            {chapter.lines.length === 0 ? (
              <Text style={styles.meta}>No lines</Text>
            ) : chapter.lines.map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <View style={styles.lineText}>
                  <Text style={styles.lineName}>{line.name}</Text>
                  <Text style={styles.meta}>{line.sideToTrain === 'WHITE' ? 'Train as White' : 'Train as Black'}</Text>
                  {line.tags.length > 0 ? <Text style={styles.tags}>{line.tags.join(' · ')}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.footer}>
          Phase 2 provides offline browsing. Starting durable offline training is enabled in Phase 3.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#f5efe6' },
  content: { padding: 22, gap: 14 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.3, color: '#6f513b' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#2e241d' },
  description: { fontSize: 15, lineHeight: 22, color: '#5a4a3f' },
  chapterCard: { gap: 10, padding: 17, borderRadius: 14, backgroundColor: '#fffaf4' },
  chapterName: { fontSize: 20, fontWeight: '800', color: '#2e241d' },
  lineRow: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d7c6b6' },
  lineText: { gap: 3 },
  lineName: { fontSize: 16, fontWeight: '700', color: '#3c2f27' },
  meta: { fontSize: 14, lineHeight: 20, color: '#76675c' },
  tags: { fontSize: 12, lineHeight: 18, color: '#8a6249' },
  footer: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#76675c' },
});
