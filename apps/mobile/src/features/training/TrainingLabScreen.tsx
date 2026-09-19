import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  applySerializableTrainingMove,
  deriveSerializableTrainingReview,
  finishSerializableTrainingEarly,
  getSerializableExpectedMove,
  restoreSerializableTrainingSession,
  type SerializableTrainingSession,
} from 'chess-domain/training';
import { ChessgroundBoard } from '../board/ChessgroundBoard';
import { createBoardEventDeduplicator } from '../board/board-event-deduplicator';
import type { BoardMoveEvent } from '../board/board.types';
import { mobileLogger } from '../../diagnostics/mobile-logger';
import {
  PHASE_ONE_TRAINING_SUBLINE,
  createPhaseOneTrainingSession,
} from './training-fixture';

export function TrainingLabScreen() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(480, Math.max(240, width - 32));
  const [session, setSession] = useState(() => createPhaseOneTrainingSession());
  const [positionVersion, setPositionVersion] = useState(0);
  const [feedback, setFeedback] = useState('Play the expected repertoire move.');
  const deduplicator = useRef(createBoardEventDeduplicator());
  const expectedMove = getSerializableExpectedMove(session, PHASE_ONE_TRAINING_SUBLINE);
  const review = useMemo(
    () => deriveSerializableTrainingReview(session, PHASE_ONE_TRAINING_SUBLINE),
    [session],
  );

  async function handleBoardMove(event: BoardMoveEvent): Promise<void> {
    if (!deduplicator.current.accept(event.eventId)) {
      mobileLogger.warn('training-lab', 'Ignored duplicate board event', { eventId: event.eventId });
      return;
    }

    try {
      const transition = applySerializableTrainingMove(
        session,
        PHASE_ONE_TRAINING_SUBLINE,
        event.uci,
        new Date(event.emittedAt).toISOString(),
      );
      setSession(transition.session);
      setPositionVersion((value) => value + 1);
      setFeedback(
        transition.correct
          ? transition.session.completed
            ? `Line completed: ${transition.session.status.toLowerCase()}.`
            : `Correct. ${transition.appliedMoves.map((move) => move.moveSan).join(' ')}`
          : `Incorrect. The position was restored; try again.`,
      );
      mobileLogger.info('training-lab', 'Applied board move', {
        eventId: event.eventId,
        moveUci: event.uci,
        correct: transition.correct,
        completed: transition.session.completed,
      });
    } catch (error) {
      setPositionVersion((value) => value + 1);
      setFeedback('The move could not be evaluated. The board was restored.');
      mobileLogger.error('training-lab', 'Failed to apply board move', error);
    }
  }

  function finishEarly(): void {
    try {
      const transition = finishSerializableTrainingEarly(
        session,
        PHASE_ONE_TRAINING_SUBLINE,
        new Date().toISOString(),
      );
      setSession(transition.session);
      setPositionVersion((value) => value + 1);
      setFeedback(`Finished early. Missed ${transition.expectedMoveUci}.`);
      mobileLogger.info('training-lab', 'Training finished early', {
        expectedMoveUci: transition.expectedMoveUci,
      });
    } catch (error) {
      mobileLogger.error('training-lab', 'Failed to finish training early', error);
    }
  }

  function restart(): void {
    deduplicator.current.reset();
    setSession(createPhaseOneTrainingSession());
    setPositionVersion((value) => value + 1);
    setFeedback('New local session started.');
    mobileLogger.info('training-lab', 'Training session restarted');
  }

  function verifyJsonRestore(): void {
    try {
      const persisted = JSON.parse(JSON.stringify(session)) as SerializableTrainingSession;
      const restored = restoreSerializableTrainingSession(
        persisted,
        PHASE_ONE_TRAINING_SUBLINE,
      );
      setSession(restored);
      setPositionVersion((value) => value + 1);
      setFeedback(`JSON restore verified with ${restored.events.length} event(s).`);
      mobileLogger.info('training-lab', 'Training snapshot restored', {
        eventCount: restored.events.length,
      });
    } catch (error) {
      setFeedback('Snapshot replay failed validation.');
      mobileLogger.error('training-lab', 'Training snapshot replay failed', error);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PHASE 1 LOCAL TRAINING</Text>
          <Text style={styles.title}>Ruy Lopez training loop</Text>
          <Text style={styles.body}>
            Chessground emits one semantic move. The shared reducer evaluates it, records an immutable event, auto-plays the fixed opponent reply, and returns an authoritative FEN. No API is involved.
          </Text>
        </View>

        <ChessgroundBoard
          fen={session.currentFen}
          orientation={session.sideToTrain === 'WHITE' ? 'white' : 'black'}
          lastMove={toLastMove(session.lastMoveUci)}
          arrows={[]}
          coordinates
          movable={!session.completed}
          positionVersion={positionVersion}
          size={boardSize}
          onMove={handleBoardMove}
          onReady={async (event) => {
            mobileLogger.info('training-board', 'Chessground ready', {
              instanceId: event.instanceId,
              initializationCount: event.initializationCount,
            });
          }}
          onError={async (event) => {
            setFeedback(`Board error: ${event.code}`);
            mobileLogger.error('training-board', event.code, event.message);
          }}
        />

        <View style={styles.feedbackCard}>
          <Text style={styles.feedback}>{feedback}</Text>
          <Text style={styles.expected}>
            {session.completed
              ? `Result: ${session.status}`
              : `Expected: ${expectedMove?.moveSan ?? '—'} (${expectedMove?.moveUci ?? '—'})`}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Correct" value={session.counters.correctMoves} />
          <Stat label="Mistakes" value={session.counters.mistakesCount} />
          <Stat label="Attempts" value={session.counters.totalExpectedMoves} />
          <Stat
            label="Accuracy"
            value={session.counters.accuracy === null ? '—' : `${Math.round(session.counters.accuracy * 100)}%`}
          />
        </View>

        <View style={styles.actions}>
          <ActionButton label="Verify JSON restore" onPress={verifyJsonRestore} />
          <ActionButton label="Finish early" onPress={finishEarly} disabled={session.completed} />
          <ActionButton label="Restart line" onPress={restart} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Immutable attempt events</Text>
          {session.events.length === 0 ? (
            <Text style={styles.muted}>No attempts yet.</Text>
          ) : (
            session.events.map((event) => (
              <View key={event.sequence} style={styles.eventRow}>
                <Text style={styles.eventSequence}>#{event.sequence}</Text>
                <Text style={styles.eventText}>
                  {event.kind === 'MISSED_ON_EARLY_FINISH'
                    ? `missed ${event.expectedMoveUci}`
                    : `${event.playedMoveUci} — ${event.wasCorrect ? 'correct' : `expected ${event.expectedMoveUci}`}`}
                </Text>
              </View>
            ))
          )}
        </View>

        {review.mistakes.length > 0 ? (
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
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
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

function toLastMove(moveUci: string | null): [string, string] | null {
  if (!moveUci || moveUci.length < 4) return null;
  return [moveUci.slice(0, 2), moveUci.slice(2, 4)];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  content: { gap: 18, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  header: { gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#6f513b' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#2e241d' },
  body: { fontSize: 16, lineHeight: 23, color: '#5a4a3f' },
  feedbackCard: { gap: 6, padding: 16, borderRadius: 14, backgroundColor: '#fffaf4' },
  feedback: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#2e241d' },
  expected: { fontSize: 14, color: '#6f513b' },
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
  muted: { fontSize: 14, lineHeight: 20, color: '#76675c' },
  eventRow: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
  eventSequence: { width: 28, fontSize: 13, fontWeight: '800', color: '#6f513b' },
  eventText: { flex: 1, fontSize: 14, color: '#3f342d' },
  reviewCard: { gap: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8c8b7' },
  reviewTitle: { fontSize: 15, fontWeight: '800', color: '#2e241d' },
  reviewBody: { fontSize: 14, lineHeight: 20, color: '#4f4239' },
});
