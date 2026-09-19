import assert from 'node:assert/strict';
import {
  createAccountImportAutomaticRefreshService,
} from '../../dist/modules/account-imports/account-import.automatic-refresh.service.js';

const NOW = new Date('2026-08-31T06:00:00.000Z');
const MINUTE = 60 * 1_000;

{
  const active = storedRun(11, 1, 'RUNNING');
  const service = createService({
    accountIds: [1],
    decisions: new Map([[1, { kind: 'alreadyActive', run: active }]]),
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'alreadyActive');
  assert.equal(result.items[0].importRun.id, active.id);
}

{
  const lastSuccessfulRefreshAt = new Date('2026-08-31T05:00:00.000Z');
  const nextEligibleAt = new Date('2026-09-01T05:00:00.000Z');
  const service = createService({
    accountIds: [1],
    decisions: new Map([[1, {
      kind: 'fresh',
      lastSuccessfulRefreshAt,
      nextEligibleAt,
    }]]),
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'fresh');
  assert.equal(result.items[0].lastSuccessfulRefreshAt, lastSuccessfulRefreshAt.toISOString());
  assert.equal(result.items[0].nextEligibleAt, nextEligibleAt.toISOString());
}

{
  const retryAt = new Date(NOW.getTime() + MINUTE);
  const service = createService({
    accountIds: [1],
    decisions: new Map([[1, { kind: 'retryThrottled', retryAt }]]),
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'failed');
  assert.equal(result.items[0].code, 'ACCOUNT_IMPORT_RETRY_THROTTLED');
  assert.equal(result.items[0].retryAt, retryAt.toISOString());
}

{
  const retryRun = storedRun(31, 1, 'QUEUED');
  retryRun.retryOfImportRunId = 29;
  const service = createService({
    accountIds: [1],
    decisions: new Map([[1, { kind: 'accepted', run: retryRun }]]),
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'accepted');
  assert.equal(result.items[0].importRun.retryOfImportRunId, 29);
}

{
  const service = createService({
    accountIds: [1, 2],
    decisions: new Map([[2, { kind: 'accepted', run: storedRun(40, 2, 'QUEUED') }]]),
    throwForAccountId: 1,
  });

  const result = await service.refreshForUser(7);
  assert.deepEqual(result.items.map((item) => item.status), ['failed', 'accepted']);
  assert.equal(result.items[0].code, 'ACCOUNT_IMPORT_UNEXPECTED');
  assert.equal(result.items[1].importRun.accountId, 2);
}

{
  const service = createService({
    accountIds: [1],
    decisions: new Map([[1, { kind: 'inactive' }]]),
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'failed');
  assert.equal(result.items[0].code, 'ACCOUNT_IMPORT_ADMISSION_BLOCKED');
}

console.log('Automatic account refresh service tests passed.');

function createService({ accountIds, decisions = new Map(), throwForAccountId = null }) {
  return createAccountImportAutomaticRefreshService(
    {
      repository: {
        async listActiveAccountIds() {
          return accountIds;
        },
        async evaluateAndAccept(_userId, accountId, options) {
          assert.equal(options.evaluatedAt.toISOString(), NOW.toISOString());
          if (accountId === throwForAccountId) throw new Error('snapshot read failed');
          return decisions.get(accountId) ?? { kind: 'missingCoverage' };
        },
      },
    },
    { now: () => new Date(NOW.getTime()) },
  );
}

function storedRun(id, accountId, status) {
  const createdAt = new Date('2026-08-31T05:00:00.000Z');
  return {
    id,
    userId: 7,
    accountId,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'ACCOUNT_REFRESH',
    status,
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-08-30T00:00:00.000Z'),
    requestedTo: new Date('2026-08-31T00:00:00.000Z'),
    retryOfImportRunId: null,
    priority: 10,
    windowsTotal: null,
    windowsCompleted: 0,
    gamesSeen: 0,
    gamesMatchedScope: 0,
    gamesImported: 0,
    gamesDuplicate: 0,
    gamesUpdated: 0,
    gamesSkipped: 0,
    gamesSkippedOutOfScope: 0,
    gamesFailed: 0,
    lastProgressAt: null,
    checkpoint: null,
    workKey: null,
    claimedAt: null,
    heartbeatAt: null,
    pauseRequestedAt: null,
    cancelRequestedAt: null,
    retryAt: null,
    rateLimitUntil: null,
    startedAt: createdAt,
    completedAt: null,
    errorCode: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
  };
}
