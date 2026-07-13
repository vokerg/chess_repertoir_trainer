import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  applySerializableTrainingMove,
  deriveSerializableTrainingReview,
  finishSerializableTrainingEarly,
  getSerializableExpectedMove,
} from 'chess-domain/training';
import { useMobileSession } from '../../auth/MobileSessionProvider';
import {
  openLineTraining,
  persistOfflineTrainingTransition,
  restartLineTraining,
  type OfflineTrainingContext,
} from '../../db/repositories/course-content.repository';
import { mobileLogger } from '../../diagnostics/mobile-logger';
import { ChessgroundBoard } from '../board/ChessgroundBoard';
import { createBoardEventDeduplicator } from '../board/board-event-deduplicator';
import type { BoardMoveEvent } from '../board/board.types';

export function OfflineTrainingScreen() {
  const params = useLocalSearchParams<{ courseId?: string; lineId?: string }>();
  const courseId = Number(params.courseId);
  const lineId = Number(params.lineId);
  const db = useSQLiteContext();
  const mobileSession = useMobileSession();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(480, Math.max(240, width - 32));
  const [training, setTraining] = useState<OfflineTrainingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Preparing offline training…');
  const [positionVersion, setPositionVersion] = useState(0);
  const deduplicator = useRef(createBoardEventDeduplicator());

  useEffect(() => {
    if (!mobileSession.activeUser || !isPositiveInteger(courseId) || !isPositiveInteger(lineId)) {
      setLoading(false);
      setTraining(null);
      setError('The downloaded line or local user is unavailable.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTraining(null);
    setError(null);
    void openLineTraining(db, mobileSession.activeUser.appUserId, courseId, lineId)
      .then((value) => {
        if (cancelled) return;
        setTraining(value);
        setFeedback(initialFeedback(value));
        setPositionVersion((version) => version + 1);
      })
      .catch((caught: unknown) => {
        mobileLogger.error('offline-training', 'Could not open local training', caught);
        if (!cancelled) {
          setTraining(null);
          setError(messageFor(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, db, lineId, mobileSession.activeUser]);

  const expectedMove = training
    ? getSerializableExpectedMove(training.session, training.subline)
    : null;
  const review = useMemo(
    () => training ? deriveSerializableTrainingReview(training.session, training.subline) : null,
    [training],
  );

  async function handleBoardMove(event: BoardMoveEvent): Promise<void> {
    const current = training;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!current || !appUserId || saving) return;
    if (!deduplicator.current.accept(event.eventId)) {
      mobileLogger.warn('offline-training', 'Ignored duplicate board event', { eventId: event.eventId });
      return;
    }

    setSaving(true);
    try {
      const transition = applySerializableTrainingMove(
        current.session,
        current.subline,
        event.uci,
        new Date(event.emittedAt).toISOString(),
      );
      const pendingAttemptCount = await persistOfflineTrainingTransition(
        db,
        appUserId,
        current,
        transition.session,
      );
      setTraining({
        ...current,
        localStatus: transition.session.completed ? 'COMPLETED' : 'IN_PROGRESS',
        resumed: false,
        pendingAttemptCount,
        session: transition.session,
      });
      setPositionVersion((version) => version + 1);
      setFeedback(
        transition.correct
          ? transition.session.completed
            ? `Line completed: ${transition.session.status.toLowerCase()}. Saved locally.`
            : `Correct. ${transition.appliedMoves.map((move) => move.moveSan).join(' ')}`
          : 'Incorrect. The position was restored; try again.',
      );
      mobileLogger.info('offline-training', 'Persisted local move transition', {
        eventId: event.eventId,
        sessionId: transition.session.sessionId,
        correct: transition.correct,
        completed: transition.session.completed,
      });
    } catch (caught) {
      setPositionVersion((version) => version + 1);
      setFeedback('The move was not saved. The board was restored.');
      mobileLogger.error('offline-training', 'Could not persist local move transition', caught);
    } finally {
      setSaving(false);
    }
  }

  async function finishEarly(): Promise<void> {
    const current = training;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!current || !appUserId || current.session.completed || saving) return;
    setSaving(true);
    try {
      const transition = finishSerializableTrainingEarly(
        current.session,
        current.subline,
        new Date().toISOString(),
      );
      const pendingAttemptCount = await persistOfflineTrainingTransition(
        db,
        appUserId,
        current,
        transition.session,
      );
      setTraining({
        ...current,
        localStatus: 'COMPLETED',
        resumed: false,
        pendingAttemptCount,
        session: transition.session,
      });
      setPositionVersion((version) => version + 1);
      setFeedback(`Finished early. Missed ${transition.expectedMoveUci}. Saved locally.`);
    } catch (caught) {
      setFeedback('The early finish could not be saved.');
      mobileLogger.error('offline-training', 'Could not finish local training', caught);
    } finally {
      setSaving(false);
    }
  }

  async function startAgain(): Promise<void> {
    const current = training;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!current || !appUserId || saving) return;
    setSaving(true);
    try {
      const next = await restartLineTraining(db, appUserId, current);
      deduplicator.current.reset();
      setTraining(next);
      setFeedback('New offline attempt started.');
      setPositionVersion((version) => version + 1);
    } catch (caught) {
      setFeedback('A new local attempt could not be started.');
      mobileLogger.error('offline-training', 'Could not restart local training', caught);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Restoring local session…</Text>
      </SafeAreaView>
    );
  }

  if (!training) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Training unavailable</Text>
        <Text style={styles.muted}>{error ?? 'Download a trainable line first.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OFFLINE • REVISION {training.contentRevision}</Text>
          <Text style={styles.title}>{training.lineName}</Text>
          <Text style={styles.muted}>{training.courseName}</Text>
          {training.resumed ? <Text style={styles.resumeBadge}>Resumed saved session</Text> : null}
        </View>

        <ChessgroundBoard
          fen={training.session.currentFen}
          orientation={training.session.sideToTrain === 'WHITE' ? 'white' : 'black'}
          lastMove={toLastMove(training.session.lastMoveUci)}
          arrows={[]}
          coordinates
          movable={!training.session.completed && !saving}
          positionVersion={positionVersion}
          size={boardSize}
          onMove={handleBoardMove}
          onReady={async (event) => {
            mobileLogger.info('offline-training-board', 'Chessground ready', {
              instanceId: event.instanceId,
            });
          }}
          onError={async (event) => {
            setFeedback(`Board error: ${event.code}`);
            mobileLogger.error('offline-training-board', event.code, event.message);
          }}
        />

        <View style={styles.feedbackCard}>
          <Text style={styles.feedback}>{saving ? 'Saving locally…' : feedback}</Text>
          <Text style={styles.expected}>
            {training.session.completed
              ? `Result: ${training.session.status}`
              : `Expected: ${expectedMove?.moveSan ?? '—'} (${expectedMove?.moveUci ?? '—'})`}
          </Text>
          <Text style={styles.pending}>
            Pending synchronization: {training.pendingAttemptCount}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Correct" value={training.session.counters.correctMoves} />
          <Stat label="Mistakes" value={training.session.counters.mistakesCount} />
          <Stat label="Attempts" value={training.session.counters.totalExpectedMoves} />
          <Stat
            label="Accuracy"
            value={training.session.counters.accuracy === null
              ? '—'
              : `${Math.round(training.session.counters.accuracy * 100)}%`}
          />
        </View>

        <View style={styles.actions}>
          {training.session.completed ? (
            <ActionButton label="Train this line again" disabled={saving} onPress={() => void startAgain()} />
          ) : (
            <>
              <ActionButton label="Finish early" disabled={saving} onPress={() => void finishEarly()} />
              <ActionButton label="Restart attempt" disabled={saving} onPress={() => void startAgain()} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved attempt events</Text>
          {training.session.events.length === 0 ? (
            <Text style={styles.muted}>No move attempts yet.</Text>
          ) : training.session.events.map((event) => (
            <View key={event.sequence} style={styles.eventRow}>
              <Text style={styles.eventSequence}>#{event.sequence}</Text>
              <Text style={styles.eventText}>
                {event.kind === 'MISSED_ON_EARLY_FINISH'
                  ? `missed ${event.expectedMoveUci}`
                  : `${event.playedMoveUci} — ${event.wasCorrect ? 'correct' : `expected ${event.expectedMoveUci}`}`}
              </Text>
            </View>
          ))}
        </View>

        {review && review.mistakes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Local review</Text>
            {review.mistakes.map((mistake) => (
              <View key={mistake.sequence} style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  Expected {mistake.expectedMoveSan} ({mistake.expectedMoveUci})
                </Text>
                <Text style={styles.muted}>
                  Played: {mistake.playedMoveUci ?? 'finished before moving'}
                </Text>
                {mistake.comment ? <Text style={styles.reviewBody}>{mistake.comment}</Text> : null}
                {mistake.annotation ? <Text style={styles.reviewBody}>{mistake.annotation}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function initialFeedback(context: OfflineTrainingContext): string {
  if (context.session.completed) return 'Completed attempt restored from local storage.';
  if (context.resumed) return `Resumed after ${context.session.events.length} saved event(s).`;
  return 'Play the expected repertoire move. Every transition is saved locally.';
}

function toLastMove(moveUci: string | null): [string, string] | null {
  if (!moveUci || moveUci.length < 4) return null;
  return [moveUci.slice(0, 2), moveUci.slice(2, 4)];
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Offline training could not be opened.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#f5efe6' },
  content: { gap: 18, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  header: { gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#6f513b' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#2e241d' },
  muted: { fontSize: 14, lineHeight: 20, color: '#76675c' },
  resumeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#e9ddcf', color: '#5d402e', fontSize: 12, fontWeight: '800' },
  feedbackCard: { gap: 6, padding: 16, borderRadius: 14, backgroundColor: '#fffaf4' },
  feedback: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#2e241d' },
  expected: { fontSize: 14, color: '#6f513b' },
  pending: { fontSize: 13, fontWeight: '700', color: '#8a6249' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { minWidth: 76, flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: '#e9ddcf' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2e241d' },
  statLabel: { marginTop: 2, fontSize: 12, color: '#6f513b' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: '#6b452d' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  section: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: '#fffaf4' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2e241d' },
  eventRow: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
  eventSequence: { width: 28, fontSize: 13, fontWeight: '800', color: '#6f513b' },
  eventText: { flex: 1, fontSize: 14, color: '#3f342d' },
  reviewCard: { gap: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8c8b7' },
  reviewTitle: { fontSize: 15, fontWeight: '800', color: '#2e241d' },
  reviewBody: { fontSize: 14, lineHeight: 20, color: '#4f4239' },
});
