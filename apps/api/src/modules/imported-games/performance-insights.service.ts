import { GAME_TAG, GAME_TAG_DEFINITIONS } from './game-tags';
import {
  GamePerformanceBucket,
  GamePerformanceInputGame,
  GamePerformanceSummary,
  GamePerformanceTagStat,
  GamePerformanceWdl,
} from './performance-insights.types';

const TAG_NAMES = new Map<number, string>(GAME_TAG_DEFINITIONS.map((tag) => [tag.code, tag.name]));

const TAG_BUCKETS = [
  {
    key: 'opening',
    label: 'Opening',
    tags: [
      GAME_TAG.OPENING_SUCCESS,
      GAME_TAG.OPENING_TROUBLE,
      GAME_TAG.OPENING_DISASTER,
      GAME_TAG.WON_FROM_OPENING,
      GAME_TAG.LOST_FROM_OPENING,
      GAME_TAG.OPENING_FAMILY_KNOWN,
    ],
  },
  {
    key: 'gameEnd',
    label: 'Game end',
    tags: [
      GAME_TAG.WON_BY_RESIGNATION,
      GAME_TAG.LOST_BY_RESIGNATION,
      GAME_TAG.WON_BY_CHECKMATE,
      GAME_TAG.LOST_BY_CHECKMATE,
      GAME_TAG.DRAW_TIMEOUT_INSUFFICIENT_MATERIAL,
      GAME_TAG.DRAW_BY_STALEMATE,
      GAME_TAG.DRAW_BY_REPETITION,
      GAME_TAG.DRAW_BY_INSUFFICIENT_MATERIAL,
      GAME_TAG.GAME_ABANDONED,
      GAME_TAG.DRAW_OTHER,
    ],
  },
  {
    key: 'conversion',
    label: 'Conversion',
    tags: [
      GAME_TAG.CLEAN_CONVERSION,
      GAME_TAG.FAILED_CONVERSION,
      GAME_TAG.MISSED_WIN,
      GAME_TAG.LOST_WINNING_POSITION,
      GAME_TAG.LOST_FROM_BETTER_POSITION,
      GAME_TAG.WON_LOST_POSITION,
      GAME_TAG.SAVED_LOST_POSITION,
    ],
  },
  {
    key: 'tactics',
    label: 'Tactics',
    tags: [
      GAME_TAG.EARLY_MISTAKE,
      GAME_TAG.EARLY_BLUNDER,
      GAME_TAG.ONE_MOVE_BLUNDER,
      GAME_TAG.OPPONENT_BLUNDERED,
      GAME_TAG.PUNISHED_OPPONENT_BLUNDER,
      GAME_TAG.FOUND_KNOCKOUT,
      GAME_TAG.MISSED_KNOCKOUT,
      GAME_TAG.MISSED_DRAW,
    ],
  },
  {
    key: 'phase',
    label: 'Phase',
    tags: [
      GAME_TAG.MIDGAME_TURNAROUND_TO_LOSS,
      GAME_TAG.MIDGAME_TURNAROUND_TO_WIN,
      GAME_TAG.ENDGAME_THROW,
      GAME_TAG.ENDGAME_SAVE,
      GAME_TAG.SLOW_BLEED_LOSS,
      GAME_TAG.WON_FROM_MIDDLEGAME,
      GAME_TAG.LOST_FROM_MIDDLEGAME,
    ],
  },
  {
    key: 'positionState',
    label: 'Position state',
    tags: [
      GAME_TAG.WAS_MUCH_WORSE,
      GAME_TAG.WAS_LOST,
      GAME_TAG.WAS_MUCH_BETTER,
      GAME_TAG.WAS_WINNING,
      GAME_TAG.WON_FROM_WORSE_POSITION,
      GAME_TAG.COMEBACK_WIN,
      GAME_TAG.COMEBACK_DRAW,
      GAME_TAG.OPPONENT_MISSED_CHANCE,
    ],
  },
  {
    key: 'time',
    label: 'Time',
    tags: [
      GAME_TAG.WON_ON_TIME,
      GAME_TAG.LOST_ON_TIME,
      GAME_TAG.FLAGGED_IN_WINNING_POSITION,
      GAME_TAG.OPPONENT_FLAGGED_IN_WINNING_POSITION,
      GAME_TAG.OPPONENT_FLAGGED_IN_LOST_POSITION,
      GAME_TAG.TIME_SCRAMBLE,
      GAME_TAG.MUTUAL_TIME_SCRAMBLE,
      GAME_TAG.PLAYED_TOO_FAST,
    ],
  },
  {
    key: 'quality',
    label: 'Quality',
    tags: [
      GAME_TAG.HIGH_ACCURACY_LOSS,
      GAME_TAG.LOW_ACCURACY_WIN,
      GAME_TAG.CHAOTIC_GAME,
      GAME_TAG.QUICK_WIN,
      GAME_TAG.QUICK_LOSS,
      GAME_TAG.SHORT_DECISIVE_GAME,
      GAME_TAG.LONG_GRIND,
    ],
  },
] as const;

function emptyWdl(): GamePerformanceWdl {
  return { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };
}

function addResult(wdl: GamePerformanceWdl, result: string | null): void {
  if (result === 'WIN') wdl.wins += 1;
  else if (result === 'DRAW') wdl.draws += 1;
  else if (result === 'LOSS') wdl.losses += 1;
  else return;

  wdl.total += 1;
  wdl.scorePct = Math.round(((wdl.wins + wdl.draws * 0.5) / wdl.total) * 1000) / 10;
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function tagName(code: number): string {
  return TAG_NAMES.get(code) ?? `TAG_${code}`;
}

export function summarizeGamePerformance(games: readonly GamePerformanceInputGame[]): GamePerformanceSummary {
  const distinctGames = new Map<number, GamePerformanceInputGame>();
  for (const game of games) {
    if (!distinctGames.has(game.id)) distinctGames.set(game.id, game);
  }

  const sampleGames = distinctGames.size;
  const positionWdl = emptyWdl();
  const taggedGameIds = new Set<number>();
  const tagStats = new Map<number, { gameIds: Set<number>; wdl: GamePerformanceWdl }>();

  for (const game of distinctGames.values()) {
    addResult(positionWdl, game.resultForUser);
    const gameTags = new Set(game.tagCodes ?? []);
    if (gameTags.size) taggedGameIds.add(game.id);

    for (const code of gameTags) {
      const stat = tagStats.get(code) ?? { gameIds: new Set<number>(), wdl: emptyWdl() };
      stat.gameIds.add(game.id);
      addResult(stat.wdl, game.resultForUser);
      tagStats.set(code, stat);
    }
  }

  const tags: GamePerformanceTagStat[] = Array.from(tagStats.entries())
    .map(([code, stat]) => ({
      code,
      name: tagName(code),
      games: stat.gameIds.size,
      ratePct: rate(stat.gameIds.size, taggedGameIds.size),
      wdl: stat.wdl,
    }))
    .sort((left, right) => right.games - left.games || left.code - right.code);
  const tagsByCode = new Map(tags.map((tag) => [tag.code, tag]));

  const buckets: GamePerformanceBucket[] = TAG_BUCKETS
    .map((bucket) => {
      const bucketTags = bucket.tags
        .map((code) => tagsByCode.get(code))
        .filter((tag): tag is GamePerformanceTagStat => Boolean(tag));
      const gameIds = new Set<number>();
      for (const code of bucket.tags) {
        for (const gameId of tagStats.get(code)?.gameIds ?? []) {
          gameIds.add(gameId);
        }
      }

      return {
        key: bucket.key,
        label: bucket.label,
        games: gameIds.size,
        ratePct: rate(gameIds.size, taggedGameIds.size),
        tags: bucketTags.sort((left, right) => right.games - left.games || left.code - right.code),
      };
    })
    .filter((bucket) => bucket.tags.length > 0);

  return {
    sample: {
      games: sampleGames,
      taggedGames: taggedGameIds.size,
    },
    wdl: positionWdl,
    tags,
    buckets,
  };
}
