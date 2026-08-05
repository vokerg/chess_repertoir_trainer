import type {
  ImportedGameWorkflowCandidates,
  ImportRunSummary,
  LichessConnectionStatus,
} from '../data-access/accounts.models';
import {
  buildNewImportedWorkflowState,
  missingLichessScopeLabels,
} from './account-settings-view';

describe('account settings view helpers', () => {
  it('intersects newly imported game ids with current workflow candidates once', () => {
    const result: ImportRunSummary = {
      importRunId: 3,
      status: 'COMPLETED',
      gamesSeen: 5,
      gamesImported: 4,
      gamesUpdated: 0,
      gamesFailed: 0,
      eligibleImportedGameIds: [11, 12, 12, 13, 14],
      eligibleUnindexedGameIds: [11, 12, 15],
    };
    const candidates: ImportedGameWorkflowCandidates = {
      accountId: 7,
      eligibleImportedGameIds: [11, 12, 13, 14],
      eligibleUnindexedGameIds: [12, 14],
      eligibleIndexedGameIds: [11, 13],
      eligibleMissingOpeningGameIds: [],
    };

    expect(buildNewImportedWorkflowState(result, candidates)).toEqual({
      eligibleCount: 4,
      unindexedGameIds: [12],
      indexedGameIds: [11, 13],
    });
  });

  it('returns empty actions before workflow candidates are available', () => {
    const result: ImportRunSummary = {
      importRunId: 4,
      status: 'COMPLETED',
      gamesSeen: 1,
      gamesImported: 1,
      gamesUpdated: 0,
      gamesFailed: 0,
      eligibleImportedGameIds: [21],
      eligibleUnindexedGameIds: [21],
    };

    expect(buildNewImportedWorkflowState(result, undefined)).toEqual({
      eligibleCount: 1,
      unindexedGameIds: [],
      indexedGameIds: [],
    });
  });

  it('reports every missing required Lichess permission in user-facing order', () => {
    const account: NonNullable<LichessConnectionStatus['account']> = {
      username: 'tester',
      lichessUserId: 'tester',
      scopes: ['puzzle:read'],
      connectedAt: '2026-08-05T00:00:00.000Z',
    };

    expect(missingLichessScopeLabels(account)).toEqual([
      'bot challenges',
      'submit puzzle results',
    ]);
  });
});
