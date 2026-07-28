import {
  defaultPlayerChessProfileFilters,
  playerChessProfilePeriodRange,
} from './player-chess-profile-period';

describe('player chess profile period', () => {
  const now = new Date(2026, 6, 28, 12, 0, 0);

  it('uses three months, both colours and blitz-and-slower by default', () => {
    const filters = defaultPlayerChessProfileFilters(now);

    expect(filters.period).toBe('3M');
    expect(filters.from).toBe('2026-04-28');
    expect(filters.to).toBe('2026-07-28');
    expect(filters.colors).toEqual(['WHITE', 'BLACK']);
    expect(filters.speedPreset).toBe('BLITZ_AND_SLOWER');
  });

  it('represents all time with an explicit lower bound for the API contract', () => {
    expect(playerChessProfilePeriodRange('ALL', now)).toEqual({
      period: 'ALL',
      from: '1970-01-01',
      to: '2026-07-28',
    });
  });
});
