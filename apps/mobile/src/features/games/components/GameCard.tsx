import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ImportedGameListItemDto } from '@/api/dto';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { shortDate } from '@/utils/dates';
import { resultForUserLabel } from '@/utils/resultLabels';
import { formatTimeControl, timeControlFromRaw } from '@/utils/timeControl';

export function GameCard({
  game,
  onAnalyze,
  onIndex,
  onOpenProvider,
}: {
  game: ImportedGameListItemDto;
  onAnalyze?: () => void;
  onIndex?: () => void;
  onOpenProvider?: () => void;
}) {
  const tc = formatTimeControl(game.timeControl.initial, game.timeControl.increment) || timeControlFromRaw(game.timeControl.raw);
  return (
    <Card style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text style={styles.title}>
            {game.white?.username ?? 'White'} vs {game.black?.username ?? 'Black'}
          </Text>
          <Text style={styles.meta}>{shortDate(game.endedAt ?? game.startedAt)} · {tc || game.speedCategory || 'time control'}</Text>
          {game.opening ? <Text style={styles.meta}>{game.opening.eco ? `${game.opening.eco} ` : ''}{game.opening.name}</Text> : null}
        </View>
        <Pill label={resultForUserLabel(game.resultForUser)} tone={game.resultForUser === 'WIN' ? 'success' : game.resultForUser === 'LOSS' ? 'danger' : 'neutral'} />
      </View>
      <View style={styles.badges}>
        <Pill label={game.provider} />
        <Pill label={`Analysis ${game.analysis.status}`} />
        <Pill label={`Ply ${game.plyIndex.status}`} />
      </View>
      <View style={styles.actions}>
        <Link href={`/games/${game.id}`} asChild>
          <Button title="Replay" />
        </Link>
        <Button title="Analyse" variant="secondary" onPress={onAnalyze} />
        <Button title="Index plies" variant="secondary" onPress={onIndex} />
        {game.providerUrl ? <Button title="Provider" variant="secondary" onPress={onOpenProvider} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
