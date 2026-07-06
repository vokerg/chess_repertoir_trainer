import { Link } from 'expo-router';
import { Chess } from 'chess.js';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserColor } from '@/api/dto';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Board } from '@/features/board/Board';
import { EnginePanel } from '@/features/engine/components/EnginePanel';
import { useOpeningAnalysis } from '../hooks/useOpeningAnalysis';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { INITIAL_FEN, playUci } from '@/utils/chess';
import { scoreLabel, wdlLabel } from '@/utils/wdl';

export function OpeningAnalysisScreen() {
  const [perspective, setPerspective] = useState<UserColor>('WHITE');
  const [fen, setFen] = useState(INITIAL_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const query = useOpeningAnalysis({ fen, userColor: perspective });
  const chess = useMemo(() => new Chess(fen), [fen]);
  const yourMove = chess.turn() === (perspective === 'WHITE' ? 'w' : 'b');

  function reset(nextPerspective = perspective): void {
    setPerspective(nextPerspective);
    setFen(INITIAL_FEN);
    setHistory([]);
  }

  function play(moveUci: string): void {
    const nextFen = playUci(fen, moveUci);
    if (!nextFen) return;
    setHistory((value) => [...value, fen]);
    setFen(nextFen);
  }

  return (
    <Screen>
      <Header title="Opening analysis" subtitle="Probe your indexed rated games from each position." />
      <SegmentedControl
        value={perspective}
        onChange={(value) => reset(value)}
        options={[
          { label: 'White', value: 'WHITE' },
          { label: 'Black', value: 'BLACK' },
        ]}
      />
      <Card style={styles.summary}>
        <Text style={styles.title}>{yourMove ? 'Your move' : 'Opponent move'}</Text>
        <Text style={styles.meta}>
          {query.data?.occurrences ?? 0} games · WDL {query.data ? wdlLabel(query.data.games) : '0 0 0'} · Score {query.data ? scoreLabel(query.data.games) : '-'}
        </Text>
      </Card>
      <Board fen={fen} side={perspective} onMove={play} />
      <View style={styles.row}>
        <Button title="Start" variant="secondary" onPress={() => reset()} />
        <Button
          title="Back"
          variant="secondary"
          onPress={() => {
            const previous = history.at(-1);
            if (previous) {
              setFen(previous);
              setHistory((value) => value.slice(0, -1));
            }
          }}
        />
        <Button title="Flip" variant="secondary" onPress={() => setPerspective((value) => (value === 'WHITE' ? 'BLACK' : 'WHITE'))} />
      </View>
      {query.isLoading ? <LoadingState label="Loading opening data..." /> : null}
      {query.error ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      <Card style={styles.summary}>
        <Text style={styles.title}>Next moves</Text>
        {query.data?.nextMoves.map((move) => (
          <View key={move.moveUci} style={styles.nextMove}>
            <View style={styles.grow}>
              <Text style={styles.moveText}>{move.moveSan ?? move.moveUci}</Text>
              <Text style={styles.meta}>{move.occurrences} games · {wdlLabel(move.games)} · {scoreLabel(move.games)}</Text>
            </View>
            <Button title="Play" variant="secondary" onPress={() => play(move.moveUci)} />
          </View>
        ))}
      </Card>
      <Card style={styles.summary}>
        <Text style={styles.title}>Top games</Text>
        {query.data?.topGames?.map((game) => (
          <Link key={game.id} href={`/games/${game.id}`} asChild>
            <Button title={`${game.white?.username ?? 'White'} vs ${game.black?.username ?? 'Black'}`} variant="ghost" />
          </Link>
        ))}
      </Card>
      <EnginePanel fen={fen} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.md,
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
  nextMove: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  moveText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
