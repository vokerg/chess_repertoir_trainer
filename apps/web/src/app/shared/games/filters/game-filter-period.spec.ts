import { defaultGameFilters } from './game-filter.model';
import { detectGameFilterPeriod, gameFilterPeriodRange } from './game-filter-period';

describe('game filter periods', () => {
  const today = new Date(2026, 6, 16, 15, 30);

  it('calculates the Today, month, YTD, and year presets through today', () => {
    expect(gameFilterPeriodRange('TODAY', today)).toEqual({
      from: '2026-07-16',
      to: '2026-07-16',
    });
    expect(gameFilterPeriodRange('1M', today)).toEqual({
      from: '2026-06-16',
      to: '2026-07-16',
    });
    expect(gameFilterPeriodRange('3M', today)).toEqual({
      from: '2026-04-16',
      to: '2026-07-16',
    });
    expect(gameFilterPeriodRange('YTD', today)).toEqual({
      from: '2026-01-01',
      to: '2026-07-16',
    });
    expect(gameFilterPeriodRange('1Y', today).from).toBe('2025-07-16');
    expect(gameFilterPeriodRange('3Y', today).from).toBe('2023-07-16');
    expect(gameFilterPeriodRange('5Y', today).from).toBe('2021-07-16');
  });

  it('detects every exact preset date pair', () => {
    for (const period of ['TODAY', '1M', '3M', 'YTD', '1Y', '3Y', '5Y', 'ALL'] as const) {
      expect(detectGameFilterPeriod(gameFilterPeriodRange(period, today), today)).toBe(period);
    }
  });

  it('uses empty dates for All', () => {
    expect(gameFilterPeriodRange('ALL', today)).toEqual({ from: '', to: '' });
  });

  it('detects non-preset and partially populated dates as Custom', () => {
    expect(detectGameFilterPeriod({ from: '2026-04-15', to: '2026-07-16' }, today)).toBe('CUSTOM');
    expect(detectGameFilterPeriod({ from: '2026-04-16', to: '' }, today)).toBe('CUSTOM');
  });

  it('clamps calendar month subtraction to the target month end', () => {
    expect(gameFilterPeriodRange('1M', new Date(2025, 2, 31))).toEqual({
      from: '2025-02-28',
      to: '2025-03-31',
    });
    expect(gameFilterPeriodRange('1M', new Date(2024, 2, 31))).toEqual({
      from: '2024-02-29',
      to: '2024-03-31',
    });
  });

  it('clamps leap day when subtracting calendar years', () => {
    expect(gameFilterPeriodRange('1Y', new Date(2024, 1, 29))).toEqual({
      from: '2023-02-28',
      to: '2024-02-29',
    });
  });

  it('defaults to the rolling 3M range with both dates populated', () => {
    const filters = defaultGameFilters(today);

    expect({ from: filters.from, to: filters.to }).toEqual({
      from: '2026-04-16',
      to: '2026-07-16',
    });
  });
});
