import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { GameCard } from '../components/GameCard';
import { useGamesExplorer } from '../hooks/useGamesExplorer';
import { spacing } from '@/theme/spacing';

export function GamesScreen() {
  const [opponent, setOpponent] = useState('');
  const filters = useMemo(() => ({ opponent: opponent.trim() || undefined }), [opponent]);
  const { games, analyze, indexPly } = useGamesExplorer(filters);
  const items = games.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Screen>
      <Header title="Games" subtitle="Explore imported games, run analysis, and open replay." />
      <TextField label="Opponent filter" value={opponent} onChangeText={setOpponent} placeholder="Username" />
      {games.isLoading ? <LoadingState label="Loading imported games..." /> : null}
      {games.error ? <ErrorState message={games.error.message} onRetry={() => void games.refetch()} /> : null}
      {items.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onAnalyze={() => analyze.mutate({ id: game.id, force: game.analysis.status === 'COMPLETED' })}
          onIndex={() => indexPly.mutate({ id: game.id, force: game.plyIndex.status === 'FAILED' })}
          onOpenProvider={() => game.providerUrl && void Linking.openURL(game.providerUrl)}
        />
      ))}
      {games.hasNextPage ? (
        <View style={styles.loadMore}>
          <Button title="Load more" variant="secondary" onPress={() => void games.fetchNextPage()} disabled={games.isFetchingNextPage} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadMore: {
    gap: spacing.sm,
  },
});
