import type {
  PlayerChessProfileFilters,
  PlayerChessProfilePeriod,
} from '../data-access/player-chess-profile.models';

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function subtractCalendarMonths(date: Date, months: number): Date {
  const originalDay = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastTargetDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastTargetDay));
  return target;
}

export function playerChessProfilePeriodRange(
  period: Exclude<PlayerChessProfilePeriod, 'CUSTOM'>,
  now = new Date(),
): Pick<PlayerChessProfileFilters, 'period' | 'from' | 'to'> {
  const to = dateInputValue(now);
  if (period === 'ALL') return { period, from: '1970-01-01', to };
  if (period === '1Y') return { period, from: dateInputValue(subtractCalendarMonths(now, 12)), to };
  if (period === '1M') return { period, from: dateInputValue(subtractCalendarMonths(now, 1)), to };
  return { period, from: dateInputValue(subtractCalendarMonths(now, 3)), to };
}

export function defaultPlayerChessProfileFilters(now = new Date()): PlayerChessProfileFilters {
  return {
    ...playerChessProfilePeriodRange('3M', now),
    accountIds: [],
    speedPreset: 'BLITZ_AND_SLOWER',
    colors: ['WHITE', 'BLACK'],
    rated: true,
    minUserRating: null,
    maxUserRating: null,
    minOpponentRating: null,
    maxOpponentRating: null,
  };
}
