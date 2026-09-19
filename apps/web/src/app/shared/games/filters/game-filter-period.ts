export type GameFilterPeriod =
  | 'TODAY'
  | '1M'
  | '3M'
  | 'YTD'
  | '1Y'
  | '3Y'
  | '5Y'
  | 'ALL'
  | 'CUSTOM';

export type GameFilterPresetPeriod = Exclude<GameFilterPeriod, 'CUSTOM'>;

export interface GameFilterDateRange {
  from: string;
  to: string;
}

export function formatLocalDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function gameFilterPeriodRange(
  period: GameFilterPresetPeriod,
  now = new Date(),
): GameFilterDateRange {
  if (period === 'ALL') return { from: '', to: '' };

  const to = formatLocalDateForInput(now);
  let from: Date;

  switch (period) {
    case 'TODAY':
      from = now;
      break;
    case '1M':
      from = subtractCalendarMonths(now, 1);
      break;
    case '3M':
      from = subtractCalendarMonths(now, 3);
      break;
    case 'YTD':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case '1Y':
      from = subtractCalendarYears(now, 1);
      break;
    case '3Y':
      from = subtractCalendarYears(now, 3);
      break;
    case '5Y':
      from = subtractCalendarYears(now, 5);
      break;
  }

  return { from: formatLocalDateForInput(from), to };
}

export function detectGameFilterPeriod(
  range: GameFilterDateRange,
  now = new Date(),
): GameFilterPeriod {
  const presets: readonly GameFilterPresetPeriod[] = [
    'TODAY',
    '1M',
    '3M',
    'YTD',
    '1Y',
    '3Y',
    '5Y',
    'ALL',
  ];

  return presets.find((period) => sameRange(range, gameFilterPeriodRange(period, now))) ?? 'CUSTOM';
}

function subtractCalendarMonths(date: Date, months: number): Date {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const day = Math.min(
    date.getDate(),
    daysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()),
  );
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
}

function subtractCalendarYears(date: Date, years: number): Date {
  const targetYear = date.getFullYear() - years;
  const day = Math.min(date.getDate(), daysInMonth(targetYear, date.getMonth()));
  return new Date(targetYear, date.getMonth(), day);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameRange(left: GameFilterDateRange, right: GameFilterDateRange): boolean {
  return left.from === right.from && left.to === right.to;
}
