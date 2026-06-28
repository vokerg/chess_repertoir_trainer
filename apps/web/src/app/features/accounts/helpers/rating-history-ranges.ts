import { AccountRatingHistoryQuery, RatingRangeKey } from '../data-access/accounts.models';

export const RATING_RANGE_OPTIONS: readonly RatingRangeKey[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'];

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

export function getRatingHistoryRangeQuery(
  range: RatingRangeKey,
  now = new Date(),
): Pick<AccountRatingHistoryQuery, 'from' | 'to'> {
  if (range === 'ALL') return {};

  const to = startOfUtcDay(now);
  const from =
    range === '1M'
      ? addUtcMonths(to, -1)
      : range === '3M'
        ? addUtcMonths(to, -3)
        : range === '6M'
          ? addUtcMonths(to, -6)
          : range === 'YTD'
            ? new Date(Date.UTC(to.getUTCFullYear(), 0, 1))
            : range === '1Y'
              ? addUtcYears(to, -1)
              : range === '3Y'
                ? addUtcYears(to, -3)
                : addUtcYears(to, -5);

  return {
    from: dateOnly(from),
    to: dateOnly(to),
  };
}
