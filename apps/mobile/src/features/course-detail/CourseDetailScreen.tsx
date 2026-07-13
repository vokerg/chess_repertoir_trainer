import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const router = useRouter();
  const db = useSQLiteContext();
  const session = useMobileSession();
  const [course, setCourse] = useState<LocalCourseHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!session.activeUser || !Number.isSafeInteger(courseId) || courseId < 1) {
      setLoading(false);
      setCourse(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
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
  }, [courseId, db, session.activeUser]));

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
              <Pressable
                accessibilityRole="button"
                key={line.id}
                onPress={() => router.push({
                  pathname: '/training/[lineId]',
                  params: { lineId: String(line.id), courseId: String(course.courseId) },
                })}
                style={({ pressed }) => [styles.lineRow, pressed ? styles.lineRowPressed : null]}
              >
                <View style={styles.lineText}>
                  <Text style={styles.lineName}>{line.name}</Text>
                  <Text style={styles.meta}>
                    {line.sideToTrain === 'WHITE' ? 'Train as White' : 'Train as Black'}
                  </Text>
                  {line.tags.length > 0 ? <Text style={styles.tags}>{line.tags.join(' · ')}</Text> : null}
                  <Text style={styles.progress}>
                    {line.hasInProgressSession
                      ? 'Resume saved attempt'
                      : line.latestResult
                        ? `Last result: ${line.latestResult.toLowerCase()}`
                        : 'Not trained locally'}
                    {' · '}{line.attemptCount} completed
                    {line.pendingAttemptCount > 0 ? ` · ${line.pendingAttemptCount} pending sync` : ''}
                  </Text>
                </View>
                <Text style={styles.lineAction}>
                  {line.hasInProgressSession ? 'Resume' : line.latestResult ? 'Review' : 'Train'}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <Text style={styles.footer}>
          Training runs from SQLite and Chessground. Every semantic transition is saved before the board continues.
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
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d7c6b6' },
  lineRowPressed: { opacity: 0.65 },
  lineText: { flex: 1, gap: 3 },
  lineName: { fontSize: 16, fontWeight: '700', color: '#3c2f27' },
  lineAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, overflow: 'hidden', backgroundColor: '#6b452d', color: '#ffffff', fontSize: 13, fontWeight: '800' },
  meta: { fontSize: 14, lineHeight: 20, color: '#76675c' },
  tags: { fontSize: 12, lineHeight: 18, color: '#8a6249' },
  progress: { fontSize: 12, lineHeight: 18, color: '#6f513b' },
  footer: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#76675c' },
});
