import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Board } from '@/features/board/Board';
import { EnginePanel } from '@/features/engine/components/EnginePanel';
import { useGameDetail } from '../hooks/useGameDetail';
import { buildGameTree } from '../utils/gameTree';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { shortDate } from '@/utils/dates';

export function GameDetailScreen() {
  const params = useLocalSearchParams<{ gameId: string }>();
  const gameId = Number(params.gameId);
  const { game, pgn, analysis } = useGameDetail(gameId);
  const [selectedPly, setSelectedPly] = useState(0);
  const pgnText = typeof pgn.data === 'string' ? pgn.data : pgn.data?.pgn ?? game.data?.pgn ?? '';
  const tree = useMemo(() => (pgnText ? buildGameTree(pgnText) : null), [pgnText]);
  const current = selectedPly === 0 ? null : tree?.moves[selectedPly - 1] ?? null;
  const fen = current?.fenAfter ?? tree?.root.fenAfter ?? 'startpos';

  if (game.isLoading || pgn.isLoading) return <Screen><LoadingState label="Loading game..." /></Screen>;
  if (game.error) return <Screen><ErrorState message={game.error.message} onRetry={() => void game.refetch()} /></Screen>;

  return (
    <Screen>
      <Header title="Game replay" subtitle={`${game.data?.provider ?? ''} · ${shortDate(game.data?.endedAt ?? game.data?.startedAt)}`} />
      <Card style={styles.summary}>
        <Text style={styles.title}>{game.data?.white?.username ?? 'White'} vs {game.data?.black?.username ?? 'Black'}</Text>
        <Text style={styles.meta}>{game.data?.opening?.name ?? 'Unknown opening'}</Text>
        <Text style={styles.meta}>Analysis: {analysis.data?.status ?? game.data?.analysis.status}</Text>
      </Card>
      <Board fen={fen} side={game.data?.userColor ?? 'WHITE'} disabled />
      <View style={styles.row}>
        <Button title="Start" variant="secondary" onPress={() => setSelectedPly(0)} />
        <Button title="Previous" variant="secondary" onPress={() => setSelectedPly((value) => Math.max(0, value - 1))} />
        <Button title="Next" variant="secondary" onPress={() => setSelectedPly((value) => Math.min(tree?.moves.length ?? 0, value + 1))} />
        <Button title="End" variant="secondary" onPress={() => setSelectedPly(tree?.moves.length ?? 0)} />
      </View>
      <Card style={styles.summary}>
        <Text style={styles.title}>Moves</Text>
        {tree?.moves.map((move) => (
          <Text key={move.id} style={[styles.move, move.plyNumber === selectedPly && styles.selectedMove]}>
            {move.moveNumber}. {move.side === 'WHITE' ? '' : '...'} {move.san}
          </Text>
        ))}
      </Card>
      <EnginePanel fen={fen} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.sm,
  },
  title: {
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
  move: {
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  selectedMove: {
    color: colors.accent,
    fontWeight: '900',
  },
});
