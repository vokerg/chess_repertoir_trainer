import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Board } from '@/features/board/Board';
import { ExpectedMoveCard } from '../components/ExpectedMoveCard';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { lastMoveFromUci } from '@/utils/chess';

export function LineTrainScreen() {
  const params = useLocalSearchParams<{ lineId: string }>();
  const lineId = Number(params.lineId);
  const { line, session, start, playMove, review } = useTrainingSession(lineId);
  const [hintVisible, setHintVisible] = useState(false);
  const [positionVersion, setPositionVersion] = useState(0);

  async function handleMove(uci: string): Promise<void> {
    if (playMove.isPending || !session) return;
    const result = await playMove.mutateAsync(uci);
    if (result.correct) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPositionVersion((value) => value + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  if (line.isLoading || start.isPending || !session) return <Screen><LoadingState label="Starting training..." /></Screen>;
  if (line.error) return <Screen><ErrorState message={line.error.message} onRetry={() => void line.refetch()} /></Screen>;
  if (start.error) return <Screen><ErrorState message={start.error.message} onRetry={() => start.mutate()} /></Screen>;

  const feedback = playMove.data?.completed ? 'Line completed' : playMove.data ? (playMove.data.correct ? 'Correct' : 'Incorrect. Same position - try again.') : 'Make the repertoire move.';
  const lastMove = lastMoveFromUci(playMove.data?.playedMoves?.at(-1)?.moveUci);

  return (
    <Screen>
      <Header title={line.data?.name ?? 'Training'} subtitle={`Train as ${line.data?.sideToTrain ?? ''}`} />
      <Board
        fen={session.fen}
        side={line.data?.sideToTrain ?? 'WHITE'}
        disabled={playMove.isPending || playMove.data?.completed === true}
        lastMove={lastMove}
        positionVersion={positionVersion}
        onMove={(uci) => void handleMove(uci)}
      />
      <Card style={styles.feedback}>
        <Text style={styles.feedbackTitle}>{feedback}</Text>
        <Text style={styles.meta}>
          Expected: {hintVisible ? session.expectedMoveUci ?? 'none' : 'hidden'} · Attempts update when the session completes.
        </Text>
      </Card>
      <View style={styles.row}>
        <Button title={hintVisible ? 'Hide hint' : 'Show hint'} variant="secondary" onPress={() => setHintVisible((value) => !value)} />
        <Button title="Train again" variant="secondary" onPress={() => start.mutate()} />
      </View>
      <ExpectedMoveCard fen={session.fen} expectedMoveUci={session.expectedMoveUci} visible={hintVisible} />
      {playMove.data?.completed ? (
        <Card style={styles.feedback}>
          <Text style={styles.feedbackTitle}>Review</Text>
          {review.isLoading ? <LoadingState label="Loading mistake review..." /> : null}
          {(review.data?.mistakes ?? []).map((mistake, index) => (
            <Text key={`${mistake.fen}-${index}`} style={styles.meta}>
              {index + 1}. Played {mistake.playedMoveUci ?? '-'} · Expected {mistake.expectedMoveUci ?? '-'}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedback: {
    gap: spacing.sm,
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
