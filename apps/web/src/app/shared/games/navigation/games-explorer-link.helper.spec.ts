import { gamesExplorerLinkQueryParams } from './games-explorer-link.helper';

describe('games explorer link helper', () => {
  it('builds explicit Angular-compatible query params from supported criteria only', () => {
    expect(gamesExplorerLinkQueryParams({
      providers: ['LICHESS'],
      variant: ['standard', 'chess960'],
      rated: false,
      limit: 25,
    })).toEqual({
      filterMode: 'explicit',
      providers: 'LICHESS',
      rated: 'false',
      variant: 'chess960,standard',
      sort: 'endedAtDesc',
      limit: '25',
    });
  });
});
