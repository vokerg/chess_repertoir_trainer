import assert from 'node:assert/strict';
import {
  accountImportErrorCodeSchema,
  accountImportRunListQuerySchema,
  accountImportRunSchema,
  createAccountImportRunBodySchema,
} from '../dist/account-imports/index.js';

assert.deepEqual(accountImportRunListQuerySchema.parse({}), {
  active: false,
  limit: 20,
});
assert.deepEqual(accountImportRunListQuerySchema.parse({ active: 'true', limit: '25' }), {
  active: true,
  limit: 25,
});
assert.equal(accountImportRunListQuerySchema.safeParse({ active: 'yes' }).success, false);
assert.equal(accountImportRunListQuerySchema.safeParse({ limit: '101' }).success, false);

const createBody = {
  accountId: 7,
  mode: 'BOUNDED_INITIAL',
  scope: {
    variant: 'STANDARD',
    speeds: ['BLITZ', 'RAPID'],
    rated: 'BOTH',
  },
  requestedFrom: '2026-05-01T00:00:00.000Z',
  requestedTo: '2026-08-01T00:00:00.000Z',
};
assert.deepEqual(createAccountImportRunBodySchema.parse(createBody), createBody);
assert.equal(
  createAccountImportRunBodySchema.safeParse({
    ...createBody,
    requestedFrom: createBody.requestedTo,
    requestedTo: createBody.requestedFrom,
  }).success,
  false,
  'account-import API preserves the immutable non-empty half-open request range',
);

const durableRun = {
  id: 11,
  accountId: 7,
  provider: 'LICHESS',
  mode: 'BOUNDED_INITIAL',
  source: 'USER_ACTION',
  status: 'PAUSE_REQUESTED',
  scopeVersion: 1,
  scopeHash: 'a'.repeat(64),
  scope: createBody.scope,
  requestedFrom: createBody.requestedFrom,
  requestedTo: createBody.requestedTo,
  priority: 100,
  retryOfImportRunId: null,
  windows: { total: 12, completed: 4 },
  games: {
    seen: 30,
    matchedScope: 25,
    imported: 20,
    duplicate: 2,
    updated: 1,
    skipped: 2,
    skippedOutOfScope: 5,
    failed: 0,
  },
  lastProgressAt: '2026-08-11T05:00:00.000Z',
  retryAt: null,
  rateLimitUntil: null,
  createdAt: '2026-08-11T04:55:00.000Z',
  updatedAt: '2026-08-11T05:00:00.000Z',
  startedAt: '2026-08-11T04:55:00.000Z',
  completedAt: null,
  errorCode: null,
  error: null,
};
assert.deepEqual(accountImportRunSchema.parse(durableRun), durableRun);
assert.equal(
  accountImportRunSchema.safeParse({
    ...durableRun,
    windows: { total: 3, completed: 4 },
  }).success,
  false,
);

assert.equal(
  accountImportErrorCodeSchema.parse('ACCOUNT_IMPORT_INVALID_STATE'),
  'ACCOUNT_IMPORT_INVALID_STATE',
);
assert.equal(
  accountImportErrorCodeSchema.parse('ACCOUNT_IMPORT_ACTIVE'),
  'ACCOUNT_IMPORT_ACTIVE',
);

console.log('Account import lifecycle contract tests passed.');
