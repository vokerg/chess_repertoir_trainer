import type { ExternalAccount } from '../accounts/data-access/accounts.models';
import type { LibraryCatalogResponse } from '../library/data-access/library.models';
import {
  HOME_SYNC_STALE_DAYS,
  buildHomeContinueAction,
  buildHomeRecommendations,
  isSyncStale,
  selectHomeAccount,
} from './home-dashboard.helpers';
import type { HomeDashboardData } from './home-dashboard.models';

const EMPTY_DATA: HomeDashboardData = {
  accounts: [],
  catalog: { courses: [] },
  facets: null,
  recentGames: [],
  performance: null,
};

describe('home dashboard rules', () => {
  it('reuses the default, active, then first account selection order', () => {
    const accounts = [
      account(1, { isActive: false }),
      account(2, { isActive: true }),
      account(3, { isDefaultProgressAccount: true }),
    ];

    expect(selectHomeAccount(accounts)?.id).toBe(3);
    expect(selectHomeAccount(accounts.slice(0, 2))?.id).toBe(2);
    expect(selectHomeAccount(accounts.slice(0, 1))?.id).toBe(1);
  });

  it('prioritizes weak repertoire work before untrained work and analysed games', () => {
    const data: HomeDashboardData = {
      ...EMPTY_DATA,
      catalog: catalog([
        course(2, 'Quiet course', { weakSublineCount: 1, failedCount: 1 }),
        course(1, 'Main course', { weakSublineCount: 4, failedCount: 3 }),
      ]),
      recentGames: [analysedGame(9)],
    };

    const action = buildHomeContinueAction(data);

    expect(action.id).toBe('weak-course-1');
    expect(action.link).toEqual(['/courses', 1, 'marathon']);
    expect(action.queryParams).toEqual({ mode: 'WEAK_SUBLINES' });
  });

  it('falls back to the latest completed analysis when no course needs training', () => {
    const action = buildHomeContinueAction({ ...EMPTY_DATA, recentGames: [analysedGame(12)] });
    expect(action.id).toBe('review-game-12');
    expect(action.link).toEqual(['/games', 12]);
  });

  it('shows setup blockers first and never duplicates Continue', () => {
    const continueAction = buildHomeContinueAction(EMPTY_DATA);
    const recommendations = buildHomeRecommendations(EMPTY_DATA, continueAction);

    expect(recommendations.map((action) => action.id)).toEqual(['setup-account', 'setup-course']);
    expect(recommendations.some((action) => action.id === continueAction.id)).toBe(false);
  });

  it('keeps the stale-sync threshold explicit and inclusive', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const exactThreshold = new Date(now.getTime() - HOME_SYNC_STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(now.getTime() - (HOME_SYNC_STALE_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();

    expect(isSyncStale(exactThreshold, now)).toBe(true);
    expect(isSyncStale(recent, now)).toBe(false);
    expect(isSyncStale(null, now)).toBe(true);
  });
});

function account(id: number, overrides: Partial<ExternalAccount> = {}): ExternalAccount {
  return {
    id,
    userId: 1,
    provider: 'LICHESS',
    username: `player-${id}`,
    displayName: null,
    providerUserId: null,
    isActive: true,
    lastSyncAt: null,
    syncCursorTime: null,
    lastSyncRunId: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    isDefaultProgressAccount: false,
    ...overrides,
  };
}

function catalog(courses: LibraryCatalogResponse['courses']): LibraryCatalogResponse {
  return { courses };
}

function course(
  id: number,
  name: string,
  overrides: Partial<LibraryCatalogResponse['courses'][number]['stats']>,
): LibraryCatalogResponse['courses'][number] {
  return {
    id,
    name,
    description: null,
    side: 'WHITE',
    coverKey: null,
    chapters: [],
    stats: {
      scopeType: 'COURSE',
      scopeId: id,
      activeSublineCount: 5,
      trainedSublineCount: 0,
      untrainedSublineCount: 0,
      weakSublineCount: 0,
      statsWindowSize: 20,
      totalAttempts: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: 0,
      failureRate: 0,
      attemptPassRate: null,
      status: 'NEW',
      ...overrides,
    },
  };
}

function analysedGame(id: number): HomeDashboardData['recentGames'][number] {
  return {
    id,
    provider: 'LICHESS',
    providerUrl: null,
    endedAt: '2026-07-25T12:00:00.000Z',
    speedCategory: 'rapid',
    rated: true,
    timeControl: { raw: '600+0', initial: 600, increment: 0 },
    white: { username: 'player', rating: 1800 },
    black: { username: 'opponent', rating: 1820 },
    userColor: 'WHITE',
    resultForUser: 'WIN',
    opening: { eco: 'B20', name: 'Sicilian Defence' },
    tagCount: 0,
    plyIndex: { status: 'INDEXED' },
    analysis: { status: 'COMPLETED', whiteAccuracy: 88, blackAccuracy: 82, userAccuracy: 88 },
  };
}
