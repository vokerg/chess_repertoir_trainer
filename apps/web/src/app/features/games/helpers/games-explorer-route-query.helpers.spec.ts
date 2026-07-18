import { convertToParamMap } from '@angular/router';
import { defaultGameFilters } from '../../../shared/games/filters/game-filter.model';
import {
  defaultGamesExplorerQuery,
  gamesExplorerRouteQueriesEqual,
  parseGamesExplorerRouteQuery,
  patchGamesExplorerDraftQuery,
  projectGamesExplorerFilters,
  serializeGamesExplorerRouteQuery,
  summarizeUnrepresentedGamesExplorerCriteria,
} from './games-explorer-route-query.helpers';

describe('games explorer route query helpers', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');

  it('uses current Games defaults for plain /games', () => {
    const state = parseGamesExplorerRouteQuery(convertToParamMap({}), now);

    expect(state.filterMode).toBe('defaults');
    expect(state.query).toEqual(defaultGamesExplorerQuery(now));
    expect(projectGamesExplorerFilters(state.query)).toEqual(defaultGameFilters(now));
  });

  it('treats omitted explicit fields as unfiltered', () => {
    const state = parseGamesExplorerRouteQuery(convertToParamMap({
      filterMode: 'explicit',
      providers: 'LICHESS',
    }), now);

    expect(state.query.providers).toEqual(['LICHESS']);
    expect(state.query.speedCategory).toBeUndefined();
    expect(state.query.from).toBeUndefined();
    expect(state.query.to).toBeUndefined();
    expect(state.query.sort).toBe('endedAtDesc');
    expect(state.query.limit).toBe(50);
  });

  it('keeps defaults for invalid legacy parameters and ignores cursor and arbitrary parameters', () => {
    const state = parseGamesExplorerRouteQuery(convertToParamMap({
      providers: 'INVALID',
      cursor: 'stale-page',
      unknown: 'do-not-forward',
      resultForUser: 'LOSS',
    }), now);

    expect(state.query.resultForUser).toEqual(['LOSS']);
    expect(state.query.speedCategory).toEqual(['blitz', 'rapid']);
    expect(state.query).not.toEqual(jasmine.objectContaining({ cursor: jasmine.anything() }));
    expect(serializeGamesExplorerRouteQuery(state.query)).not.toContain('unknown');
    expect(serializeGamesExplorerRouteQuery(state.query)).not.toContain('cursor');
  });

  it('uses stable equality for reordered multi-value parameters', () => {
    const left = parseGamesExplorerRouteQuery(convertToParamMap({
      filterMode: 'explicit',
      providers: 'LICHESS,CHESS_COM',
    }));
    const right = parseGamesExplorerRouteQuery(convertToParamMap({
      filterMode: 'explicit',
      providers: 'CHESS_COM,LICHESS',
    }));

    expect(gamesExplorerRouteQueriesEqual(left, right)).toBeTrue();
    expect(serializeGamesExplorerRouteQuery(left.query)).toBe(
      'filterMode=explicit&limit=50&providers=CHESS_COM%2CLICHESS&sort=endedAtDesc',
    );
  });

  it('patches only changed form fields and preserves hidden and multi-value criteria', () => {
    const route = parseGamesExplorerRouteQuery(convertToParamMap({
      filterMode: 'explicit',
      providers: 'LICHESS,CHESS_COM',
      variant: 'standard,chess960',
      openingEco: 'B20,C50',
      classification: 'MISTAKE,BLUNDER',
      minUserRating: '1400',
      resultForUser: 'WIN,DRAW',
      opponent: 'before',
    }));
    const previous = projectGamesExplorerFilters(route.query);
    const draft = patchGamesExplorerDraftQuery(route.query, previous, {
      ...previous,
      opponent: 'after',
    });

    expect(draft.opponent).toBe('after');
    expect(draft.providers).toEqual(['CHESS_COM', 'LICHESS']);
    expect(draft.resultForUser).toEqual(['DRAW', 'WIN']);
    expect(draft.variant).toEqual(['chess960', 'standard']);
    expect(draft.openingEco).toEqual(['B20', 'C50']);
    expect(draft.classification).toEqual(['BLUNDER', 'MISTAKE']);
    expect(draft.minUserRating).toBe(1400);
  });

  it('summarizes route-only, multi-value, exact-time, sort, and limit criteria', () => {
    const query = parseGamesExplorerRouteQuery(convertToParamMap({
      filterMode: 'explicit',
      accountIds: '1,2',
      variant: 'standard',
      openingEco: 'C50',
      classification: 'BLUNDER',
      minUserRating: '1500',
      from: '2026-07-01T12:30:00.000Z',
      sort: 'endedAtAsc',
      limit: '25',
    })).query;

    expect(summarizeUnrepresentedGamesExplorerCriteria(query)).toEqual([
      'Accounts: 1, 2',
      'Variants: standard',
      'Opening ECO: C50',
      'Classifications: BLUNDER',
      'User rating ≥ 1500',
      'Exact start: 2026-07-01T12:30:00.000Z',
      'Sort: oldest first',
      'Page size: 25',
    ]);
  });
});
