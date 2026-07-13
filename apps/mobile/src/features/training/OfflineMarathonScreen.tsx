import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  applySerializableTrainingMove,
  deriveSerializableTrainingReview,
  finishSerializableTrainingEarly,
  getSerializableExpectedMove,
} from 'chess-domain/training';
import { useMobileSession } from '../../auth/MobileSessionProvider';
import {
  advanceOfflineMarathon,
  openOfflineMarathon,
  persistOfflineTrainingTransition,
  restartOfflineMarathonCurrent,
  startNewOfflineMarathon,
  type OfflineMarathonContext,
  type OfflineMarathonMode,
  type OfflineMarathonScopeType,
} from '../../db/repositories/course-content.repository';
import { mobileLogger } from '../../diagnostics/mobile-logger';
import { useAttemptSync } from '../../sync/AttemptSyncProvider';
import { ChessgroundBoard } from '../board/ChessgroundBoard';
import { createBoardEventDeduplicator } from '../board/board-event-deduplicator';
import type { BoardMoveEvent } from '../board/board.types';

const MODES: readonly OfflineMarathonMode[] = [
  'ALL',
  'WEAK_SUBLINES',
  'UNTRAINED_SUBLINES',
  'MIXED_WEAK_UNTRAINED',
];

export function OfflineMarathonScreen() {
  const params = useLocalSearchParams<{
    courseId?: string;
    scopeType?: string;
    scopeId?: string;
    mode?: string;
  }>();
  const courseId = Number(params.courseId);
  const scopeId = Number(params.scopeId);
  const scopeType = parseScopeType(params.scopeType);
  const requestedMode = parseMode(params.mode);
  const db = useSQLiteContext();
  const mobileSession = useMobileSession();
  const attemptSync = useAttemptSync();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(480, Math.max(240, width - 32));
  const [marathon, setMarathon] = useState<OfflineMarathonContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Preparing offline marathon…');
  const [positionVersion, setPositionVersion] = useState(0);
  const deduplicator = useRef(createBoardEventDeduplicator());

  useEffect(() => {
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!appUserId || !isPositiveInteger(courseId) || !isPositiveInteger(scopeId) || !scopeType) {
      setLoading(false);
      setMarathon(null);
      setError('The downloaded marathon scope or local user is unavailable.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void openOfflineMarathon(db, appUserId, { courseId, scopeType, scopeId, mode: requestedMode })
      .then((value) => {
        if (cancelled) return;
        setMarathon(value);
        setFeedback(initialFeedback(value));
        setPositionVersion((version) => version + 1);
      })
      .catch((caught: unknown) => {
        mobileLogger.error('offline-marathon', 'Could not open local marathon', caught);
        if (!cancelled) setError(messageFor(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, db, mobileSession.activeUser?.appUserId, requestedMode, scopeId, scopeType]);

  const training = marathon?.training ?? null;
  const expectedMove = training
    ? getSerializableExpectedMove(training.session, training.subline)
    : null;
  const review = useMemo(
    () => training ? deriveSerializableTrainingReview(training.session, training.subline) : null,
    [training],
  );

  async function handleBoardMove(event: BoardMoveEvent): Promise<void> {
    const currentRun = marathon;
    const current = currentRun?.training;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!currentRun || !current || !appUserId || saving || current.session.completed) return;
    if (!deduplicator.current.accept(event.eventId)) return;

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
      const newlyCompleted = !current.session.completed && transition.session.completed;
      setMarathon({
        ...currentRun,
        completedCount: currentRun.completedCount + (newlyCompleted ? 1 : 0),
        training: {
          ...current,
          localStatus: transition.session.completed ? 'COMPLETED' : 'IN_PROGRESS',
          resumed: false,
          pendingAttemptCount,
          session: transition.session,
        },
      });
      setPositionVersion((version) => version + 1);
      setFeedback(
        transition.correct
          ? transition.session.completed
            ? 'Line completed and queued for synchronization. Review it, then continue.'
            : `Correct. ${transition.appliedMoves.map((move) => move.moveSan).join(' ')}`
          : 'Incorrect. The position was restored; try again.',
      );
      if (transition.session.completed) void attemptSync.syncNow({ silent: true });
    } catch (caught) {
      setPositionVersion((version) => version + 1);
      setFeedback('The move was not saved. The board was restored.');
      mobileLogger.error('offline-marathon', 'Could not persist marathon move', caught);
    } finally {
      setSaving(false);
    }
  }

  async function finishEarly(): Promise<void> {
    const currentRun = marathon;
    const current = currentRun?.training;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!currentRun || !current || !appUserId || current.session.completed || saving) return;
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
      setMarathon({
        ...currentRun,
        completedCount: currentRun.completedCount + 1,
        training: {
          ...current,
          localStatus: 'COMPLETED',
          resumed: false,
          pendingAttemptCount,
          session: transition.session,
        },
      });
      setPositionVersion((version) => version + 1);
      setFeedback(`Finished early. Missed ${transition.expectedMoveUci}. The attempt is queued for sync.`);
      void attemptSync.syncNow({ silent: true });
    } catch (caught) {
      setFeedback('The early finish could not be saved.');
      mobileLogger.error('offline-marathon', 'Could not finish marathon line', caught);
    } finally {
      setSaving(false);
    }
  }

  async function nextLine(): Promise<void> {
    const currentRun = marathon;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!currentRun || !appUserId || saving) return;
    setSaving(true);
    try {
      const next = await advanceOfflineMarathon(db, appUserId, currentRun);
      deduplicator.current.reset();
      setMarathon(next);
      setFeedback(next.training ? 'Next offline marathon line started.' : 'Marathon complete for the current mode.');
      setPositionVersion((version) => version + 1);
    } catch (caught) {
      setFeedback(messageFor(caught));
      mobileLogger.error('offline-marathon', 'Could not advance marathon', caught);
    } finally {
      setSaving(false);
    }
  }

  async function restartCurrent(): Promise<void> {
    const currentRun = marathon;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!currentRun || !appUserId || saving) return;
    setSaving(true);
    try {
      const next = await restartOfflineMarathonCurrent(db, appUserId, currentRun);
      deduplicator.current.reset();
      setMarathon(next);
      setFeedback('Current marathon line restarted from its initial position.');
      setPositionVersion((version) => version + 1);
    } catch (caught) {
      setFeedback(messageFor(caught));
      mobileLogger.error('offline-marathon', 'Could not restart marathon line', caught);
    } finally {
      setSaving(false);
    }
  }

  async function switchMode(mode: OfflineMarathonMode): Promise<void> {
    const currentRun = marathon;
    const appUserId = mobileSession.activeUser?.appUserId;
    if (!currentRun || !appUserId || saving
      || (currentRun.mode === mode && currentRun.status === 'IN_PROGRESS')) return;
    setSaving(true);
    try {
      const next = await startNewOfflineMarathon(db, appUserId, {
        courseId: currentRun.courseId,
        scopeType: currentRun.scopeType,
        scopeId: currentRun.scopeId,
        mode,
      });
      deduplicator.current.reset();
      setMarathon(next);
      setFeedback(`${modeLabel(mode)} marathon started.`);
      setPositionVersion((version) => version + 1);
    } catch (caught) {
      setFeedback(messageFor(caught));
      mobileLogger.error('offline-marathon', 'Could not switch marathon mode', caught);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Restoring offline marathon…</Text>
      </SafeAreaView>
    );
  }

  if (!marathon) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Marathon unavailable</Text>
        <Text style={styles.muted}>{error ?? 'Download a trainable course first.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OFFLINE {marathon.scopeType} MARATHON • REVISION {marathon.contentRevision}</Text>
          <Text style={styles.title}>{marathon.scopeName}</Text>
          <Text style={styles.muted}>{marathon.courseName} · {marathon.completedCount} completed this run</Text>
          {marathon.resumed ? <Text style={styles.resumeBadge}>Resumed saved marathon</Text> : null}
        </View>

        <View style={styles.modeRow}>
          {MODES.map((mode) => (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              key={mode}
              onPress={() => void switchMode(mode)}
              style={[styles.modeButton, marathon.mode === mode ? styles.modeButtonActive : null]}
            >
              <Text style={[styles.modeText, marathon.mode === mode ? styles.modeTextActive : null]}>
                {modeLabel(mode)}
              </Text>
            </Pressable>
          ))}
        </View>

        {!training ? (
          <View style={styles.completeCard}>
            <Text style={styles.sectionTitle}>Marathon complete</Text>
            <Text style={styles.muted}>
              No more eligible downloaded sublines remain for {modeLabel(marathon.mode).toLowerCase()} mode.
            </Text>
            <Text style={styles.feedback}>Completed this run: {marathon.completedCount}</Text>
            <ActionButton
              label={`Start ${modeLabel(marathon.mode)} again`}
              disabled={saving}
              onPress={() => void switchMode(marathon.mode)}
            />
          </View>
        ) : (
          <>
            <View style={styles.lineHeader}>
              <Text style={styles.sectionTitle}>{training.lineName}</Text>
              <Text style={styles.muted}>Train as {training.session.sideToTrain === 'WHITE' ? 'White' : 'Black'}</Text>
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
                mobileLogger.info('offline-marathon-board', 'Chessground ready', { instanceId: event.instanceId });
              }}
              onError={async (event) => {
                setFeedback(`Board error: ${event.code}`);
                mobileLogger.error('offline-marathon-board', event.code, event.message);
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
                Pending synchronization for this line: {training.pendingAttemptCount}
                {attemptSync.syncing ? ' · syncing…' : ''}
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
                <ActionButton label="Next line" disabled={saving} onPress={() => void nextLine()} />
              ) : (
                <>
                  <ActionButton label="Finish current line" disabled={saving} onPress={() => void finishEarly()} />
                  <ActionButton label="Restart current line" disabled={saving} onPress={() => void restartCurrent()} />
                </>
              )}
            </View>

            {review && review.mistakes.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Local review</Text>
                {review.mistakes.map((mistake) => (
                  <View key={mistake.sequence} style={styles.reviewCard}>
                    <Text style={styles.reviewTitle}>
                      Expected {mistake.expectedMoveSan} ({mistake.expectedMoveUci})
                    </Text>
                    <Text style={styles.muted}>Played: {mistake.playedMoveUci ?? 'finished before moving'}</Text>
                    {mistake.comment ? <Text style={styles.reviewBody}>{mistake.comment}</Text> : null}
                    {mistake.annotation ? <Text style={styles.reviewBody}>{mistake.annotation}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
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

function ActionButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function parseScopeType(value: string | undefined): OfflineMarathonScopeType | null {
  return value === 'COURSE' || value === 'CHAPTER' ? value : null;
}

function parseMode(value: string | undefined): OfflineMarathonMode {
  return MODES.includes(value as OfflineMarathonMode) ? value as OfflineMarathonMode : 'ALL';
}

function modeLabel(mode: OfflineMarathonMode): string {
  if (mode === 'WEAK_SUBLINES') return 'Weak';
  if (mode === 'UNTRAINED_SUBLINES') return 'Untrained';
  if (mode === 'MIXED_WEAK_UNTRAINED') return 'Mixed';
  return 'All';
}

function initialFeedback(context: OfflineMarathonContext): string {
  if (!context.training) return 'No eligible sublines remain for this mode.';
  if (context.training.session.completed) return 'Completed line restored. Review it, then continue.';
  if (context.resumed || context.training.resumed) return 'Resumed the saved offline marathon position.';
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
  return error instanceof Error ? error.message : 'Offline marathon could not be opened.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#f5efe6' },
  content: { gap: 18, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  header: { gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#6f513b' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#2e241d' },
  muted: { fontSize: 14, lineHeight: 20, color: '#76675c' },
  resumeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#e9ddcf', color: '#5d402e', fontSize: 12, fontWeight: '800' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e9ddcf' },
  modeButtonActive: { backgroundColor: '#6b452d' },
  modeText: { color: '#5d402e', fontSize: 13, fontWeight: '800' },
  modeTextActive: { color: '#ffffff' },
  lineHeader: { gap: 3 },
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
  reviewCard: { gap: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8c8b7' },
  reviewTitle: { fontSize: 15, fontWeight: '800', color: '#2e241d' },
  reviewBody: { fontSize: 14, lineHeight: 20, color: '#4f4239' },
  completeCard: { gap: 8, padding: 18, borderRadius: 14, backgroundColor: '#fffaf4' },
});
