import assert from 'node:assert/strict';
import {
  automaticAccountRefreshFailureCodeSchema,
  automaticAccountRefreshResponseSchema,
} from '../dist/account-imports/index.js';

const run = {
  id: 11,
  accountId: 7,
  provider: 'LICHESS',
  mode: 'INCREMENTAL_FORWARD',
  source: 'ACCOUNT_REFRESH',
  status: 'QUEUED',
  scopeVersion: 1,
  scopeHash: 'a'.repeat(64),
  scope: { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' },
  requestedFrom: '2026-08-30T00:00:00.000Z',
  requestedTo: '2026-08-31T00:00:00.000Z',
  priority: 10,
  retryOfImportRunId: null,
  windows: { total: null, completed: 0 },
  games: {
    seen: 0,
    matchedScope: 0,
    imported: 0,
    duplicate: 0,
    updated: 0,
    skipped: 0,
    skippedOutOfScope: 0,
    failed: 0,
  },
  lastProgressAt: null,
  retryAt: null,
  rateLimitUntil: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
  startedAt: '2026-08-31T00:00:00.000Z',
  completedAt: null,
  errorCode: null,
  error: null,
};

const response = {
  items: [
    { accountId: 7, status: 'accepted', importRun: run },
    { accountId: 8, status: 'alreadyActive', importRun: { ...run, id: 12, accountId: 8 } },
    {
      accountId: 9,
      status: 'fresh',
      lastSuccessfulRefreshAt: '2026-08-31T00:00:00.000Z',
      nextEligibleAt: '2026-09-01T00:00:00.000Z',
    },
    {
      accountId: 10,
      status: 'failed',
      code: 'ACCOUNT_IMPORT_RETRY_THROTTLED',
      error: 'Automatic account refresh is temporarily throttled after a failed attempt.',
      retryAt: '2026-08-31T01:00:00.000Z',
    },
  ],
};

assert.deepEqual(automaticAccountRefreshResponseSchema.parse(response), response);
assert.equal(
  automaticAccountRefreshFailureCodeSchema.parse('ACCOUNT_IMPORT_ADMISSION_BLOCKED'),
  'ACCOUNT_IMPORT_ADMISSION_BLOCKED',
);
assert.equal(
  automaticAccountRefreshResponseSchema.safeParse({
    items: [{ accountId: 1, status: 'fresh', lastSuccessfulRefreshAt: null, nextEligibleAt: null }],
  }).success,
  false,
);

console.log('Automatic account refresh contract tests passed.');