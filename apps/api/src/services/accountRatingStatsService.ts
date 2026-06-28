import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { ExternalAccountService, ExternalProvider } from './externalAccountService';

export type RatingStatsSpeed = 'bullet' | 'blitz' | 'rapid';

export interface AccountRatingStatsPeak {
  rating: number;
  ratingAt: string;
  gameId: number;
}

export interface AccountRatingStatsYearlyPeak extends AccountRatingStatsPeak {
  year: number;
}

export interface AccountRatingStatsMilestone {
  rating: number;
  reachedAt: string;
  actualRating: number;
  gameId: number;
}

export interface AccountRatingStatsSpeedProjection {
  key: RatingStatsSpeed;
  label: 'Bullet' | 'Blitz' | 'Rapid';
  gamesCount: number;
  current: AccountRatingStatsPeak | null;
  highest: AccountRatingStatsPeak | null;
  yearlyHighs: AccountRatingStatsYearlyPeak[];
  milestones: AccountRatingStatsMilestone[];
}

export interface AccountRatingStatsProjection {
  version: 2;
  ratingSource: 'gameRecordedRating';
  speeds: AccountRatingStatsSpeedProjection[];
}

export interface AccountRatingStatsResponse {
  account: {
    id: number;
    provider: ExternalProvider;
    username: string;
    displayName?: string | null;
  };
  computedAt: string;
  gamesCount: number;
  data: AccountRatingStatsProjection;
}

const SPEEDS: readonly RatingStatsSpeed[] = ['bullet', 'blitz', 'rapid'];

const SPEED_LABELS: Record<RatingStatsSpeed, 'Bullet' | 'Blitz' | 'Rapid'> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
};

const MILESTONES = Array.from({ length: 16 }, (_, index) => 1000 + index * 100);

type AccountSummary = {
  id: number;
  provider: string;
  username: string;
  displayName?: string | null;
};

type ImportedRatingGame = {
  id: number;
  endedAt: Date | null;
  speedCategory: string | null;
  userColor: string | null;
  whiteRating: number | null;
  blackRating: number | null;
};

function getUserRating(game: Pick<ImportedRatingGame, 'userColor' | 'whiteRating' | 'blackRating'>) {
  if (game.userColor === 'WHITE') return game.whiteRating;
  if (game.userColor === 'BLACK') return game.blackRating;
  return null;
}

function isRatingSpeed(value: string | null): value is RatingStatsSpeed {
  return value === 'bullet' || value === 'blitz' || value === 'rapid';
}

function yearKey(date: Date) {
  return date.getUTCFullYear();
}

function isEarlierPeak(left: AccountRatingStatsPeak, right: AccountRatingStatsPeak) {
  return left.rating > right.rating || (left.rating === right.rating && left.ratingAt < right.ratingAt);
}

function toPeak(game: { id: number; endedAt: Date }, rating: number): AccountRatingStatsPeak {
  return {
    rating,
    ratingAt: game.endedAt.toISOString(),
    gameId: game.id,
  };
}

function buildProjection(games: ImportedRatingGame[]): { gamesCount: number; data: AccountRatingStatsProjection } {
  const bySpeed = new Map<
    RatingStatsSpeed,
    {
      gamesCount: number;
      current: AccountRatingStatsPeak | null;
      highest: AccountRatingStatsPeak | null;
      yearlyHighs: Map<number, AccountRatingStatsYearlyPeak>;
      milestones: Map<number, AccountRatingStatsMilestone>;
    }
  >();

  for (const speed of SPEEDS) {
    bySpeed.set(speed, {
      gamesCount: 0,
      current: null,
      highest: null,
      yearlyHighs: new Map(),
      milestones: new Map(),
    });
  }

  for (const game of games) {
    if (!game.endedAt || !isRatingSpeed(game.speedCategory)) continue;

    const rating = getUserRating(game);
    if (rating === null) continue;

    const speedStats = bySpeed.get(game.speedCategory);
    if (!speedStats) continue;

    speedStats.gamesCount += 1;

    const peak = toPeak({ id: game.id, endedAt: game.endedAt }, rating);
    speedStats.current = peak;

    if (!speedStats.highest || isEarlierPeak(peak, speedStats.highest)) {
      speedStats.highest = peak;
    }

    const year = yearKey(game.endedAt);
    const yearlyPeak = { ...peak, year };
    const currentYearlyPeak = speedStats.yearlyHighs.get(year);
    if (!currentYearlyPeak || isEarlierPeak(yearlyPeak, currentYearlyPeak)) {
      speedStats.yearlyHighs.set(year, yearlyPeak);
    }

    for (const milestone of MILESTONES) {
      if (rating >= milestone && !speedStats.milestones.has(milestone)) {
        speedStats.milestones.set(milestone, {
          rating: milestone,
          reachedAt: game.endedAt.toISOString(),
          actualRating: rating,
          gameId: game.id,
        });
      }
    }
  }

  const speeds = SPEEDS.map((speed) => {
    const stats = bySpeed.get(speed)!;
    return {
      key: speed,
      label: SPEED_LABELS[speed],
      gamesCount: stats.gamesCount,
      current: stats.current,
      highest: stats.highest,
      yearlyHighs: Array.from(stats.yearlyHighs.values()).sort((left, right) => left.year - right.year),
      milestones: Array.from(stats.milestones.values()).sort((left, right) => left.rating - right.rating),
    };
  });

  return {
    gamesCount: speeds.reduce((total, speed) => total + speed.gamesCount, 0),
    data: {
      version: 2,
      ratingSource: 'gameRecordedRating',
      speeds,
    },
  };
}

function toResponse(
  account: AccountSummary,
  stats: { computedAt: Date; gamesCount: number; data: Prisma.JsonValue },
): AccountRatingStatsResponse {
  return {
    account: {
      id: account.id,
      provider: account.provider as ExternalProvider,
      username: account.username,
      displayName: account.displayName,
    },
    computedAt: stats.computedAt.toISOString(),
    gamesCount: stats.gamesCount,
    data: stats.data as unknown as AccountRatingStatsProjection,
  };
}

function isCurrentProjection(data: Prisma.JsonValue): boolean {
  return Boolean(data && typeof data === 'object' && !Array.isArray(data) && (data as { version?: unknown }).version === 2);
}

export const AccountRatingStatsService = {
  recomputeForAccount: async (userId: number, accountId: number): Promise<AccountRatingStatsResponse | null> => {
    const account = await ExternalAccountService.getForUser(userId, accountId);
    if (!account) return null;

    const games = await prisma.importedGame.findMany({
      where: {
        userId,
        accountId,
        endedAt: { not: null },
        speedCategory: { in: [...SPEEDS] },
        userColor: { in: ['WHITE', 'BLACK'] },
      },
      select: {
        id: true,
        endedAt: true,
        speedCategory: true,
        userColor: true,
        whiteRating: true,
        blackRating: true,
      },
      orderBy: [{ endedAt: 'asc' }, { id: 'asc' }],
    });

    const projection = buildProjection(games);
    const computedAt = new Date();
    const stats = await prisma.accountRatingStats.upsert({
      where: { accountId },
      update: {
        computedAt,
        gamesCount: projection.gamesCount,
        data: projection.data as unknown as Prisma.InputJsonValue,
      },
      create: {
        accountId,
        computedAt,
        gamesCount: projection.gamesCount,
        data: projection.data as unknown as Prisma.InputJsonValue,
      },
    });

    return toResponse(account, stats);
  },

  getForAccount: async (userId: number, accountId: number): Promise<AccountRatingStatsResponse | null> => {
    const account = await ExternalAccountService.getForUser(userId, accountId);
    if (!account) return null;

    const stats = await prisma.accountRatingStats.findUnique({
      where: { accountId },
    });

    if (stats && isCurrentProjection(stats.data)) return toResponse(account, stats);

    return AccountRatingStatsService.recomputeForAccount(userId, accountId);
  },
};
