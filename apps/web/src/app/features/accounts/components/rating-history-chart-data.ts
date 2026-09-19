import {
  AccountRatingHistoryResponse,
  RatingHistoryPoint,
  RatingHistorySeries,
  RatingSpeed,
} from '../data-access/accounts.models';

export interface VisibleRatingPoint extends RatingHistoryPoint {
  time: number;
  seriesKey: RatingSpeed;
  seriesLabel: string;
}

export interface TooltipRow {
  key: RatingSpeed;
  label: string;
  rating: number;
  gameCount: number;
  ratingAt: string;
}

export interface TooltipData {
  date: string;
  rows: TooltipRow[];
}

export function parseRatingDate(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function normalizeVisiblePoints(history: AccountRatingHistoryResponse | null): VisibleRatingPoint[] {
  if (!history) return [];

  return history.series.flatMap((series) =>
    series.points.map((point) => ({
      ...point,
      time: parseRatingDate(point.date),
      seriesKey: series.key,
      seriesLabel: series.label,
    })),
  );
}

export function computeXDomain(points: readonly VisibleRatingPoint[]): { min: number; max: number } | null {
  if (points.length === 0) return null;
  const times = points.map((point) => point.time);
  const min = Math.min(...times);
  const max = Math.max(...times);
  return min === max ? { min: min - 12 * 60 * 60 * 1000, max: max + 12 * 60 * 60 * 1000 } : { min, max };
}

export function computeYDomain(history: AccountRatingHistoryResponse | null): { min: number; max: number } | null {
  if (history?.yDomain) return history.yDomain;

  const points = normalizeVisiblePoints(history);
  if (points.length === 0) return null;

  const ratings = points.map((point) => point.rating);
  const rawMin = Math.min(...ratings);
  const rawMax = Math.max(...ratings);
  const padding = Math.max(25, Math.round((rawMax - rawMin) * 0.08));
  return {
    min: Math.max(0, rawMin - padding),
    max: rawMax + padding,
  };
}

export function findNearestDate(points: readonly VisibleRatingPoint[], targetTime: number): string | null {
  const dates = Array.from(new Set(points.map((point) => point.date)));
  if (dates.length === 0) return null;

  return dates.reduce((nearest, date) => {
    const nearestDistance = Math.abs(parseRatingDate(nearest) - targetTime);
    const distance = Math.abs(parseRatingDate(date) - targetTime);
    return distance < nearestDistance ? date : nearest;
  });
}

export function formatTooltipRows(
  series: readonly RatingHistorySeries[],
  date: string | null,
): TooltipData | null {
  if (!date) return null;

  const rows: TooltipRow[] = [];
  for (const item of series) {
    const point = item.points.find((candidate) => candidate.date === date);
    if (!point) continue;

    rows.push({
      key: item.key,
      label: item.label,
      rating: point.rating,
      gameCount: point.gameCount,
      ratingAt: point.ratingAt,
    });
  }

  return rows.length > 0 ? { date, rows } : null;
}
