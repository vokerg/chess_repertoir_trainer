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
};

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

function betterBestVictory(left: PerformanceGame, right: PerformanceGame | null) {
  if (!right) return true;
  const leftOpponent = getOpponentRating(left);
  const rightOpponent = getOpponentRating(right);
  if (leftOpponent === null) return false;
  if (rightOpponent === null) return true;
  if (leftOpponent !== rightOpponent) return leftOpponent > rightOpponent;
  return (left.endedAt?.getTime() ?? 0) > (right.endedAt?.getTime() ?? 0);
}

function worseDefeat(left: PerformanceGame, right: PerformanceGame | null) {
  if (!right) return true;
  const leftOpponent = getOpponentRating(left);
  const rightOpponent = getOpponentRating(right);
  if (leftOpponent === null) return false;
  if (rightOpponent === null) return true;
  if (leftOpponent !== rightOpponent) return leftOpponent < rightOpponent;
  return (left.endedAt?.getTime() ?? 0) > (right.endedAt?.getTime() ?? 0);
}

export function buildAccountPerformanceStatsData(
  games: PerformanceGame[],
  query: AccountPerformanceStatsQuery,
): AccountPerformanceStatsData {
  const wdl = { wins: 0, draws: 0, losses: 0 };
  const opponentRatings = {
    wins: [] as number[],
    draws: [] as number[],
    losses: [] as number[],
  };
  let bestVictory: PerformanceGame | null = null;
  let mostEmbarrassingDefeat: PerformanceGame | null = null;

  for (const game of games) {
    const opponentRating = getOpponentRating(game);

    if (game.resultForUser === 'WIN') {
      wdl.wins += 1;
      if (opponentRating !== null) opponentRatings.wins.push(opponentRating);
      if (betterBestVictory(game, bestVictory)) bestVictory = game;
    } else if (game.resultForUser === 'DRAW') {
      wdl.draws += 1;
      if (opponentRating !== null) opponentRatings.draws.push(opponentRating);
    } else if (game.resultForUser === 'LOSS') {
      wdl.losses += 1;
      if (opponentRating !== null) opponentRatings.losses.push(opponentRating);
      if (worseDefeat(game, mostEmbarrassingDefeat)) mostEmbarrassingDefeat = game;
    }
  }

  const decidedGames = wdl.wins + wdl.draws + wdl.losses;

  return {
    range: {
      from: query.from,
      to: query.to,
    },
    speeds: query.speeds,
    gamesCount: games.length,
    wdl,
    scorePercent: decidedGames > 0 ? Math.round(((wdl.wins + wdl.draws * 0.5) / decidedGames) * 100) : null,
    averageOpponentRating: {
      wins: average(opponentRatings.wins),
      draws: average(opponentRatings.draws),
      losses: average(opponentRatings.losses),
    },
    bestVictory: bestVictory ? toHighlight(bestVictory) : null,
    mostEmbarrassingDefeat: mostEmbarrassingDefeat ? toHighlight(mostEmbarrassingDefeat) : null,
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
