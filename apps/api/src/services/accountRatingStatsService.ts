import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { ExternalAccountService, ExternalProvider } from './externalAccountService';
import {
  AccountRatingHistoryData,
  RatingSpeed,
  buildAccountRatingHistoryData,
} from './accountRatingHistoryService';
import {
  AccountPerformanceStatsData,
  PerformanceGame,
  buildAccountPerformanceStatsData,
} from './accountPerformanceStatsService';

export type RatingStatsSpeed = RatingSpeed;
export type DashboardPeriodKey = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

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
  version: 3;
  ratingSource: 'gameRecordedRating';
  speeds: AccountRatingStatsSpeedProjection[];
}

export interface AccountDashboardProjection {
  version: 3;
  ratingStats: AccountRatingStatsProjection;
  ratingHistory: AccountRatingHistoryData;
  performanceByPeriod: Record<DashboardPeriodKey, AccountPerformanceStatsData>;
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
const PERIODS: readonly DashboardPeriodKey[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'];

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
  opponentUsername?: string | null;
  resultForUser?: string | null;
  providerUrl?: string | null;
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

function buildRatingStatsProjection(games: ImportedRatingGame[]): { gamesCount: number; data: AccountRatingStatsProjection } {
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
      version: 3,
      ratingSource: 'gameRecordedRating',
      speeds,
    },
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcMonths(date: Date, months: number): Date {
  const next = startOfUtcDay(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function addUtcYears(date: Date, years: number): Date {
  const next = startOfUtcDay(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function periodRange(period: DashboardPeriodKey, now: Date): { from?: string; to?: string } {
  if (period === 'ALL') return {};

  const to = startOfUtcDay(now);
  const from =
    period === '1M'
      ? addUtcMonths(to, -1)
      : period === '3M'
        ? addUtcMonths(to, -3)
        : period === '6M'
          ? addUtcMonths(to, -6)
          : period === 'YTD'
            ? new Date(Date.UTC(to.getUTCFullYear(), 0, 1))
            : period === '1Y'
              ? addUtcYears(to, -1)
              : period === '3Y'
                ? addUtcYears(to, -3)
                : addUtcYears(to, -5);

  return {
    from: dateOnly(from),
    to: dateOnly(to),
  };
}

function inPeriod(game: { endedAt: Date | null }, range: { from?: string; to?: string }) {
  if (!game.endedAt) return false;
  if (range.from && game.endedAt < new Date(range.from)) return false;
  if (range.to && game.endedAt >= new Date(Date.parse(range.to) + 24 * 60 * 60 * 1000)) return false;
  return true;
}

function buildDashboardProjection(games: ImportedRatingGame[], now = new Date()): { gamesCount: number; data: AccountDashboardProjection } {
  const ratingStats = buildRatingStatsProjection(games);
  const ratingHistory = buildAccountRatingHistoryData(games, SPEEDS);
  const performanceByPeriod = Object.fromEntries(
    PERIODS.map((period) => {
      const range = periodRange(period, now);
      const periodGames = games.filter((game) => inPeriod(game, range)) as PerformanceGame[];
      return [
        period,
        buildAccountPerformanceStatsData(periodGames, {
          ...range,
          speeds: [...SPEEDS],
        }),
      ];
    }),
  ) as Record<DashboardPeriodKey, AccountPerformanceStatsData>;

  return {
    gamesCount: ratingStats.gamesCount,
    data: {
      version: 3,
      ratingStats: ratingStats.data,
      ratingHistory,
      performanceByPeriod,
    },
  };
}

function getStoredProjection(data: Prisma.JsonValue): AccountDashboardProjection | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return (data as { version?: unknown }).version === 3 ? (data as unknown as AccountDashboardProjection) : null;
}

function toResponse(
  account: AccountSummary,
  stats: { computedAt: Date; gamesCount: number; data: Prisma.JsonValue },
): AccountRatingStatsResponse {
  const dashboard = getStoredProjection(stats.data);
  return {
    account: {
      id: account.id,
      provider: account.provider as ExternalProvider,
      username: account.username,
      displayName: account.displayName,
    },
    computedAt: stats.computedAt.toISOString(),
    gamesCount: stats.gamesCount,
    data: dashboard ? dashboard.ratingStats : (stats.data as unknown as AccountRatingStatsProjection),
  };
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
        opponentUsername: true,
        resultForUser: true,
        providerUrl: true,
      },
      orderBy: [{ endedAt: 'asc' }, { id: 'asc' }],
    });

    const projection = buildDashboardProjection(games);
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

    if (stats && getStoredProjection(stats.data)) return toResponse(account, stats);

    return AccountRatingStatsService.recomputeForAccount(userId, accountId);
  },
};
