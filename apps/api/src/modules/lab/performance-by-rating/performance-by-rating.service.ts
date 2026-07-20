import type {
  PerformanceByRatingQuery,
  PerformanceByRatingResponse,
  PerformanceReportType,
} from '@chess-trainer/contracts/lab';
import {
  findPerformanceByRatingRows,
  type PerformanceProvider,
  type PerformanceSpeed,
} from './performance-by-rating.repository.prisma';

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function subtractUtcMonths(date: Date, months: number): Date {
  const originalDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const lastTargetDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(originalDay, lastTargetDay));
  return target;
}

export function resolvePerformanceByRatingRange(
  query: PerformanceByRatingQuery,
  now = new Date(),
): { from: string; to: string; fromDate: Date; toExclusive: Date } {
  const today = dateOnly(now);
  const to = query.to ?? today;
  const toDate = parseDateOnly(to);
  const from = query.from ?? dateOnly(subtractUtcMonths(toDate, 3));
  const fromDate = parseDateOnly(from);

  if (fromDate > toDate) throw new Error('From date must not be after to date');

  return {
    from,
    to,
    fromDate,
    toExclusive: addUtcDays(toDate, 1),
  };
}

function toNumber(value: number | bigint): number {
  return Number(value);
}

function scorePercent(wins: number, draws: number, games: number): number | null {
  return games > 0 ? Math.round((((wins + draws * 0.5) / games) * 100) * 10) / 10 : null;
}

function reportType(provider: PerformanceProvider, speed: PerformanceSpeed): PerformanceReportType {
  if (provider === 'LICHESS') {
    if (speed === 'bullet') return 'LICHESS_BULLET';
    if (speed === 'blitz') return 'LICHESS_BLITZ';
    return 'LICHESS_RAPID';
  }

  if (speed === 'bullet') return 'CHESS_COM_BULLET';
  if (speed === 'blitz') return 'CHESS_COM_BLITZ';
  return 'CHESS_COM_RAPID';
}

export async function getPerformanceByRating(
  userId: number,
  query: PerformanceByRatingQuery,
): Promise<PerformanceByRatingResponse> {
  const range = resolvePerformanceByRatingRange(query);
  const rows = await findPerformanceByRatingRows(
    userId,
    range.fromDate,
    range.toExclusive,
    query.minRating ?? 0,
  );

  return {
    range: { from: range.from, to: range.to },
    items: rows.map((row) => {
      const games = toNumber(row.games);
      const wins = toNumber(row.wins);
      const draws = toNumber(row.draws);
      return {
        provider: row.provider,
        speed: row.speed,
        type: reportType(row.provider, row.speed),
        ratingFrom: row.ratingFrom,
        ratingTo: row.ratingFrom + 99,
        games,
        analysedGames: toNumber(row.analysedGames),
        accuracyGames: toNumber(row.accuracyGames),
        wdl: { wins, draws, losses: toNumber(row.losses) },
        whiteWdl: {
          wins: toNumber(row.whiteWins),
          draws: toNumber(row.whiteDraws),
          losses: toNumber(row.whiteLosses),
        },
        blackWdl: {
          wins: toNumber(row.blackWins),
          draws: toNumber(row.blackDraws),
          losses: toNumber(row.blackLosses),
        },
        scorePercent: scorePercent(wins, draws, games),
        openingSuccess: toNumber(row.openingSuccess),
        openingTrouble: toNumber(row.openingTrouble),
        wasWinningAndLost: toNumber(row.wasWinningAndLost),
        wasLosingAndWon: toNumber(row.wasLosingAndWon),
        flaggedInWinningPosition: toNumber(row.flaggedInWinningPosition),
        opponentFlaggedInWinningPosition: toNumber(row.opponentFlaggedInWinningPosition),
        slowBleedLosses: toNumber(row.slowBleedLosses),
        slowBleedWins: toNumber(row.slowBleedWins),
        averageAccuracy: row.averageAccuracy === null
          ? null
          : Math.round(row.averageAccuracy * 10) / 10,
      };
    }),
  };
}
