import prisma from '../prisma';
import { ExternalAccountService, ExternalProvider } from './externalAccountService';
import { RatingSpeed } from './accountRatingHistoryService';

export interface AccountPerformanceStatsQuery {
  from?: string;
  to?: string;
  speeds: RatingSpeed[];
}

export interface AccountPerformanceGameHighlight {
  gameId: number;
  endedAt: string;
  speed: RatingSpeed;
  userRating: number | null;
  opponentRating: number | null;
  opponentUsername: string | null;
  providerUrl: string | null;
}

export interface AccountPerformanceTimeControlWdl {
  timeControl: string;
  gamesCount: number;
  wins: number;
  draws: number;
  losses: number;
  scorePercent: number | null;
}

export interface AccountPerformanceStatsResponse {
  account: {
    id: number;
    provider: ExternalProvider;
    username: string;
    displayName?: string | null;
  };
  range: {
    from?: string;
    to?: string;
  };
  speeds: RatingSpeed[];
  gamesCount: number;
  wdl: {
    wins: number;
    draws: number;
    losses: number;
  };
  averageOpponentRating: {
    wins: number | null;
    draws: number | null;
    losses: number | null;
  };
  timeControlWdl: AccountPerformanceTimeControlWdl[];
  bestVictories: AccountPerformanceGameHighlight[];
  mostEmbarrassingDefeats: AccountPerformanceGameHighlight[];
  bestVictory: AccountPerformanceGameHighlight | null;
  mostEmbarrassingDefeat: AccountPerformanceGameHighlight | null;
}

export type AccountPerformanceStatsData = Omit<AccountPerformanceStatsResponse, 'account'> & {
  scorePercent: number | null;
};

export type PerformanceGame = {
  id: number;
  endedAt: Date | null;
  speedCategory: string | null;
  userColor: string | null;
  whiteRating: number | null;
  blackRating: number | null;
  opponentUsername: string | null;
  resultForUser: string | null;
  providerUrl: string | null;
  timeControlRaw: string | null;
  timeControlInitial: number | null;
  timeControlIncrement: number | null;
};

const HIGHLIGHT_LIMIT = 5;
const TIME_CONTROL_WDL_LIMIT = 8;

export function buildPerformanceEndedAtRange(query: Pick<AccountPerformanceStatsQuery, 'from' | 'to'>) {
  return {
    not: null,
    ...(query.from ? { gte: new Date(query.from) } : {}),
    ...(query.to
      ? /^\d{4}-\d{2}-\d{2}$/.test(query.to)
        ? { lt: new Date(Date.parse(query.to) + 24 * 60 * 60 * 1000) }
        : { lte: new Date(query.to) }
      : {}),
  };
}

function getUserRating(game: Pick<PerformanceGame, 'userColor' | 'whiteRating' | 'blackRating'>) {
  if (game.userColor === 'WHITE') return game.whiteRating;
  if (game.userColor === 'BLACK') return game.blackRating;
  return null;
}

function getOpponentRating(game: Pick<PerformanceGame, 'userColor' | 'whiteRating' | 'blackRating'>) {
  if (game.userColor === 'WHITE') return game.blackRating;
  if (game.userColor === 'BLACK') return game.whiteRating;
  return null;
}

function toHighlight(game: PerformanceGame): AccountPerformanceGameHighlight | null {
  if (!game.endedAt || !isRatingSpeed(game.speedCategory)) return null;

  return {
    gameId: game.id,
    endedAt: game.endedAt.toISOString(),
    speed: game.speedCategory,
    userRating: getUserRating(game),
    opponentRating: getOpponentRating(game),
    opponentUsername: game.opponentUsername,
    providerUrl: game.providerUrl,
  };
}

function isRatingSpeed(value: string | null): value is RatingSpeed {
  return value === 'bullet' || value === 'blitz' || value === 'rapid';
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function formatInitialMinutes(initialSeconds: number): string {
  if (initialSeconds < 60) return `${initialSeconds}s`;
  const minutes = initialSeconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
}

function formatStructuredTimeControl(initial: number | null, increment: number | null): string | null {
  if (typeof initial !== 'number' || typeof increment !== 'number') return null;
  return `${formatInitialMinutes(initial)}+${increment}`;
}

function normalizeRawTimeControl(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value || value === '-' || value === '?') return null;

  const match = value.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+)$/);
  if (!match) return value;

  return `${Number(match[1])}+${Number(match[2])}`;
}

function normalizeTimeControl(game: PerformanceGame): string {
  return (
    formatStructuredTimeControl(game.timeControlInitial, game.timeControlIncrement) ??
    normalizeRawTimeControl(game.timeControlRaw) ??
    'Unknown'
  );
}

function isScoredGame(game: PerformanceGame) {
  return game.resultForUser === 'WIN' || game.resultForUser === 'DRAW' || game.resultForUser === 'LOSS';
}

function compareEndedAtDesc(left: PerformanceGame, right: PerformanceGame) {
  const endedAtDelta = (right.endedAt?.getTime() ?? 0) - (left.endedAt?.getTime() ?? 0);
  return endedAtDelta !== 0 ? endedAtDelta : right.id - left.id;
}

function compareBestVictories(left: PerformanceGame, right: PerformanceGame) {
  const leftOpponent = getOpponentRating(left);
  const rightOpponent = getOpponentRating(right);
  if (leftOpponent === null && rightOpponent !== null) return 1;
  if (leftOpponent !== null && rightOpponent === null) return -1;
  if (leftOpponent !== null && rightOpponent !== null && leftOpponent !== rightOpponent) {
    return rightOpponent - leftOpponent;
  }
  return compareEndedAtDesc(left, right);
}

function compareMostEmbarrassingDefeats(left: PerformanceGame, right: PerformanceGame) {
  const leftOpponent = getOpponentRating(left);
  const rightOpponent = getOpponentRating(right);
  if (leftOpponent === null && rightOpponent !== null) return 1;
  if (leftOpponent !== null && rightOpponent === null) return -1;
  if (leftOpponent !== null && rightOpponent !== null && leftOpponent !== rightOpponent) {
    return leftOpponent - rightOpponent;
  }
  return compareEndedAtDesc(left, right);
}

function toHighlights(games: PerformanceGame[]) {
  return games
    .map(toHighlight)
    .filter((game): game is AccountPerformanceGameHighlight => game !== null)
    .slice(0, HIGHLIGHT_LIMIT);
}

function buildTimeControlWdl(scoredGames: PerformanceGame[]): AccountPerformanceTimeControlWdl[] {
  const buckets = new Map<string, { wins: number; draws: number; losses: number }>();

  for (const game of scoredGames) {
    const timeControl = normalizeTimeControl(game);
    const bucket = buckets.get(timeControl) ?? { wins: 0, draws: 0, losses: 0 };

    if (game.resultForUser === 'WIN') bucket.wins += 1;
    if (game.resultForUser === 'DRAW') bucket.draws += 1;
    if (game.resultForUser === 'LOSS') bucket.losses += 1;

    buckets.set(timeControl, bucket);
  }

  return Array.from(buckets.entries())
    .map(([timeControl, bucket]) => {
      const gamesCount = bucket.wins + bucket.draws + bucket.losses;
      return {
        timeControl,
        gamesCount,
        wins: bucket.wins,
        draws: bucket.draws,
        losses: bucket.losses,
        scorePercent: gamesCount > 0 ? Math.round(((bucket.wins + bucket.draws * 0.5) / gamesCount) * 100) : null,
      };
    })
    .sort((left, right) => right.gamesCount - left.gamesCount || left.timeControl.localeCompare(right.timeControl))
    .slice(0, TIME_CONTROL_WDL_LIMIT);
}

export function buildAccountPerformanceStatsData(
  games: PerformanceGame[],
  query: AccountPerformanceStatsQuery,
): AccountPerformanceStatsData {
  const scoredGames = games.filter(isScoredGame);
  const wdl = { wins: 0, draws: 0, losses: 0 };
  const opponentRatings = {
    wins: [] as number[],
    draws: [] as number[],
    losses: [] as number[],
  };
  const wins: PerformanceGame[] = [];
  const losses: PerformanceGame[] = [];

  for (const game of scoredGames) {
    const opponentRating = getOpponentRating(game);

    if (game.resultForUser === 'WIN') {
      wdl.wins += 1;
      if (opponentRating !== null) opponentRatings.wins.push(opponentRating);
      wins.push(game);
    } else if (game.resultForUser === 'DRAW') {
      wdl.draws += 1;
      if (opponentRating !== null) opponentRatings.draws.push(opponentRating);
    } else if (game.resultForUser === 'LOSS') {
      wdl.losses += 1;
      if (opponentRating !== null) opponentRatings.losses.push(opponentRating);
      losses.push(game);
    }
  }

  const decidedGames = wdl.wins + wdl.draws + wdl.losses;
  const timeControlWdl = buildTimeControlWdl(scoredGames);
  const bestVictories = toHighlights([...wins].sort(compareBestVictories));
  const mostEmbarrassingDefeats = toHighlights([...losses].sort(compareMostEmbarrassingDefeats));

  return {
    range: {
      from: query.from,
      to: query.to,
    },
    speeds: query.speeds,
    gamesCount: scoredGames.length,
    wdl,
    scorePercent: decidedGames > 0 ? Math.round(((wdl.wins + wdl.draws * 0.5) / decidedGames) * 100) : null,
    averageOpponentRating: {
      wins: average(opponentRatings.wins),
      draws: average(opponentRatings.draws),
      losses: average(opponentRatings.losses),
    },
    timeControlWdl,
    bestVictories,
    mostEmbarrassingDefeats,
    bestVictory: bestVictories[0] ?? null,
    mostEmbarrassingDefeat: mostEmbarrassingDefeats[0] ?? null,
  };
}

export const AccountPerformanceStatsService = {
  getForAccount: async (
    userId: number,
    accountId: number,
    query: AccountPerformanceStatsQuery,
  ): Promise<AccountPerformanceStatsResponse | null> => {
    const account = await ExternalAccountService.getForUser(userId, accountId);
    if (!account) return null;

    const games = await prisma.importedGame.findMany({
      where: {
        userId,
        accountId,
        endedAt: buildPerformanceEndedAtRange(query),
        speedCategory: { in: query.speeds },
        userColor: { in: ['WHITE', 'BLACK'] },
        resultForUser: { in: ['WIN', 'DRAW', 'LOSS'] },
      },
      select: {
        id: true,
        endedAt: true,
        speedCategory: true,
        userColor: true,
        whiteRating: true,
        blackRating: true,
        opponentUsername: true,
        resultForUser: true,
        providerUrl: true,
        timeControlRaw: true,
        timeControlInitial: true,
        timeControlIncrement: true,
      },
      orderBy: [{ endedAt: 'asc' }, { id: 'asc' }],
    });

    const { scorePercent: _scorePercent, ...performance } = buildAccountPerformanceStatsData(games, query);

    return {
      account: {
        id: account.id,
        provider: account.provider as ExternalProvider,
        username: account.username,
        displayName: account.displayName,
      },
      ...performance,
    };
  },
};
