import { useNetworkState } from 'expo-network';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useMobileSession } from '../../auth/MobileSessionProvider';
import {
  listLocalCourses,
  readLastManifestSyncAt,
  type LocalCourseSummary,
} from '../../db/repositories/course-content.repository';
import { mobileLogger } from '../../diagnostics/mobile-logger';
import { downloadMobileCourse, refreshMobileManifest } from '../../sync/course-sync';
import { styles } from './course-library.styles';

export function CourseLibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const network = useNetworkState();
  const session = useMobileSession();
  const [courses, setCourses] = useState<LocalCourseSummary[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDownload, setActiveDownload] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const automaticRefreshKey = useRef<string | null>(null);

  const loadLocalState = useCallback(async () => {
    if (!session.activeUser) {
      setCourses([]);
      setLastSyncAt(null);
      return;
    }
    const [nextCourses, nextLastSyncAt] = await Promise.all([
      listLocalCourses(db, session.activeUser.appUserId),
      readLastManifestSyncAt(db, session.activeUser.appUserId),
    ]);
    setCourses(nextCourses);
    setLastSyncAt(nextLastSyncAt);
  }, [db, session.activeUser]);

  useEffect(() => {
    void loadLocalState().catch((error: unknown) => {
      mobileLogger.error('course-library', 'Could not load local courses', error);
      setMessage('Downloaded courses could not be loaded.');
    });
  }, [loadLocalState]);

  const refreshManifest = useCallback(async (silent = false) => {
    if (!session.activeUser) return;
    const token = await session.getApiToken();
    if (!token) {
      if (!silent) setMessage('Sign in while online to refresh courses.');
      return;
    }
    setRefreshing(true);
    if (!silent) setMessage(null);
    try {
      await refreshMobileManifest(db, session.activeUser.appUserId, token);
      await loadLocalState();
    } catch (error) {
      mobileLogger.error('course-library', 'Manifest refresh failed', error);
      if (!silent) setMessage(error instanceof Error ? error.message : 'Course refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }, [db, loadLocalState, session]);

  const online = network.isInternetReachable !== false && network.isConnected !== false;
  useEffect(() => {
    if (!session.canSync || !session.activeUser || !online) return;
    const key = session.activeUser.appUserId;
    if (automaticRefreshKey.current === key) return;
    automaticRefreshKey.current = key;
    void refreshManifest(true);
  }, [online, refreshManifest, session.activeUser, session.canSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session.canSync && online) void refreshManifest(true);
    });
    return () => subscription.remove();
  }, [online, refreshManifest, session.canSync]);

  const downloadCourse = useCallback(async (courseId: number) => {
    if (!session.activeUser) return;
    const token = await session.getApiToken();
    if (!token) {
      setMessage('Sign in while online to download or update a course.');
      return;
    }
    setActiveDownload(courseId);
    setMessage(null);
    try {
      await downloadMobileCourse(db, session.activeUser.appUserId, courseId, token);
      await loadLocalState();
    } catch (error) {
      mobileLogger.error('course-library', 'Course download failed', error);
      setMessage(error instanceof Error ? error.message : 'Course download failed.');
      await loadLocalState();
    } finally {
      setActiveDownload(null);
    }
  }, [db, loadLocalState, session]);

  if (!session.isReady) {
    return <CenteredStatus text="Opening offline library…" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshManifest()} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OFFLINE TRAINING LIBRARY</Text>
          <Text style={styles.title}>Chess Repertoire Trainer</Text>
          <Text style={styles.body}>
            Downloaded courses remain browseable after the app is closed or the network disappears.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {session.isAuthenticated ? 'Signed in and ready to sync' : session.activeUser ? 'Offline access' : 'Sign in required'}
          </Text>
          {session.activeUser ? (
            <Text style={styles.statusText}>
              {session.activeUser.displayName ?? session.activeUser.email ?? session.activeUser.appUserId}
            </Text>
          ) : null}
          <Text style={styles.statusText}>Network: {online ? 'available' : 'offline'}</Text>
          <Text style={styles.statusText}>Last manifest sync: {formatDate(lastSyncAt)}</Text>
          <View style={styles.actionsRow}>
            {!session.isAuthenticated ? (
              <Pressable style={styles.primaryButton} onPress={() => router.push('/(auth)/sign-in')}>
                <Text style={styles.primaryButtonText}>Sign in</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.secondaryButton} onPress={() => void refreshManifest()} disabled={refreshing}>
                <Text style={styles.secondaryButtonText}>Refresh</Text>
              </Pressable>
            )}
            {session.activeUser ? (
              <Pressable style={styles.linkButton} onPress={() => void session.signOutAndLock()}>
                <Text style={styles.linkButtonText}>Sign out and lock</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Courses</Text>
          {refreshing ? <ActivityIndicator /> : null}
        </View>

        {!session.activeUser ? (
          <Text style={styles.emptyText}>Sign in once to download courses for offline access.</Text>
        ) : courses.length === 0 ? (
          <Text style={styles.emptyText}>
            No courses are available locally. Refresh while online to load your course manifest.
          </Text>
        ) : courses.map((course) => {
          const canOpen = course.activeContentRevision !== null;
          const downloading = activeDownload === course.courseId || course.state === 'DOWNLOADING';
          return (
            <View key={course.courseId} style={styles.courseCard}>
              <Text style={styles.courseName}>{course.name}</Text>
              {course.description ? <Text style={styles.courseDescription}>{course.description}</Text> : null}
              <Text style={styles.meta}>{stateLabel(course.state)}</Text>
              <Text style={styles.meta}>
                Local revision {course.activeContentRevision ?? '—'} · Server revision {course.serverContentRevision ?? 'unknown'}
              </Text>
              {course.lastError ? <Text style={styles.errorText}>{course.lastError}</Text> : null}
              <View style={styles.actionsRow}>
                {canOpen ? (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.push({ pathname: '/courses/[courseId]', params: { courseId: String(course.courseId) } })}
                  >
                    <Text style={styles.primaryButtonText}>Open offline</Text>
                  </Pressable>
                ) : null}
                {course.state !== 'UNAVAILABLE' ? (
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={downloading || !session.canSync}
                    onPress={() => void downloadCourse(course.courseId)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {downloading ? 'Downloading…' : downloadLabel(course)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        <View style={styles.developerSection}>
          <Text style={styles.sectionTitle}>Developer tools</Text>
          <Link href="/training-lab" style={styles.devLink}>Local training proof</Link>
          <Link href="/board-lab" style={styles.devLink}>Chessground diagnostics</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CenteredStatus({ text }: { text: string }) {
  return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator />
      <Text style={styles.statusText}>{text}</Text>
    </SafeAreaView>
  );
}

function downloadLabel(course: LocalCourseSummary): string {
  if (course.activeContentRevision === null) return 'Download';
  if (course.state === 'UPDATE_AVAILABLE') return 'Update';
  if (course.state === 'ERROR') return 'Retry';
  return 'Download again';
}

function stateLabel(state: LocalCourseSummary['state']): string {
  return ({
    NOT_DOWNLOADED: 'Not downloaded',
    DOWNLOADING: 'Downloading',
    AVAILABLE: 'Available offline',
    UPDATE_AVAILABLE: 'Update available',
    ERROR: 'Last update failed; previous revision remains available',
    UNAVAILABLE: 'No longer available on the server',
  } satisfies Record<LocalCourseSummary['state'], string>)[state];
}

function formatDate(value: string | null): string {
  if (!value) return 'never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

