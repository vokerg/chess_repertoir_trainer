import assert from 'node:assert/strict';
import {
  AccountImportRangeUnavailableError,
  toAccountImportRun,
} from '../../dist/modules/account-imports/account-import.service.js';
import {
  createAccountImportAutomaticRefreshService,
} from '../../dist/modules/account-imports/account-import.automatic-refresh.service.js';

const NOW = new Date('2026-08-31T06:00:00.000Z');
const HOUR = 60 * 60 * 1_000;
const MINUTE = 60 * 1_000;

{
  let commandCalls = 0;
  const active = storedRun(11, 1, 'RUNNING');
  const service = createService({
    accountIds: [1],
    activeByAccount: new Map([[1, active]]),
    command: async () => {
      commandCalls += 1;
      return { importRun: toAccountImportRun(storedRun(12, 1, 'QUEUED')) };
    },
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'alreadyActive');
  assert.equal(result.items[0].importRun.id, active.id);
  assert.equal(commandCalls, 0, 'existing active work remains authoritative');
}

{
  let commandCalls = 0;
  const service = createService({
    accountIds: [1],
    snapshots: new Map([[1, {
      latestSuccessfulForwardAt: new Date(NOW.getTime() - 23 * HOUR),
      lastAutomaticFailureAt: null,
      automaticFailureCount: 0,
    }]]),
    command: async () => {
      commandCalls += 1;
      return { importRun: toAccountImportRun(storedRun(20, 1, 'QUEUED')) };
    },
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'fresh');
  assert.equal(commandCalls, 0, 'inside the 24-hour rolling cooldown no work is accepted');
}

{
  let commandCalls = 0;
  const service = createService({
    accountIds: [1],
    snapshots: new Map([[1, {
      latestSuccessfulForwardAt: new Date(NOW.getTime() - 24 * HOUR),
      lastAutomaticFailureAt: null,
      automaticFailureCount: 0,
    }]]),
    command: async () => {
      commandCalls += 1;
      return { importRun: toAccountImportRun(storedRun(21, 1, 'QUEUED')) };
    },
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'accepted');
  assert.equal(commandCalls, 1, 'the exact cooldown boundary is eligible again');
}

{
  let commandCalls = 0;
  const service = createService({
    accountIds: [1],
    snapshots: new Map([[1, {
      latestSuccessfulForwardAt: new Date(NOW.getTime() - 25 * HOUR),
      lastAutomaticFailureAt: new Date(NOW.getTime() - 9 * MINUTE),
      automaticFailureCount: 2,
    }]]),
    command: async () => {
      commandCalls += 1;
      return { importRun: toAccountImportRun(storedRun(30, 1, 'QUEUED')) };
    },
    retryBaseMs: 5 * MINUTE,
    retryMaxMs: 20 * MINUTE,
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'failed');
  assert.equal(result.items[0].code, 'ACCOUNT_IMPORT_RETRY_THROTTLED');
  assert.equal(result.items[0].retryAt, new Date(NOW.getTime() + MINUTE).toISOString());
  assert.equal(commandCalls, 0);
}

{
  let commandCalls = 0;
  const service = createService({
    accountIds: [1],
    snapshots: new Map([[1, {
      latestSuccessfulForwardAt: new Date(NOW.getTime() - 25 * HOUR),
      lastAutomaticFailureAt: new Date(NOW.getTime() - 10 * MINUTE),
      automaticFailureCount: 2,
    }]]),
    command: async () => {
      commandCalls += 1;
      return { importRun: toAccountImportRun(storedRun(31, 1, 'QUEUED')) };
    },
    retryBaseMs: 5 * MINUTE,
    retryMaxMs: 20 * MINUTE,
  });

  const result = await service.refreshForUser(7);
  assert.equal(result.items[0].status, 'accepted');
  assert.equal(commandCalls, 1, 'the exact retry boundary is eligible again');
}

{
  const service = createService({
    accountIds: [1, 2],
    command: async (_userId, accountId) => {
      if (accountId === 1) {
        throw new AccountImportRangeUnavailableError('Automatic refresh requires existing recent account coverage.');
      }
      return { importRun: toAccountImportRun(storedRun(40, accountId, 'QUEUED')) };
    },
  });

  const result = await service.refreshForUser(7);
  assert.deepEqual(result.items.map((item) => item.status), ['failed', 'accepted']);
  assert.equal(result.items[0].code, 'ACCOUNT_IMPORT_INVALID_RANGE');
  assert.equal(result.items[1].importRun.accountId, 2);
}

console.log('Automatic account refresh service tests passed.');

function createService({
  accountIds,
  activeByAccount = new Map(),
  snapshots = new Map(),
  command,
  retryBaseMs,
  retryMaxMs,
}) {
  return createAccountImportAutomaticRefreshService(
    {
      repository: {
        async listActiveAccountIds() {
          return accountIds;
        },
        async getSnapshot(_userId, accountId) {
          return snapshots.get(accountId) ?? {
            latestSuccessfulForwardAt: null,
            lastAutomaticFailureAt: null,
            automaticFailureCount: 0,
          };
        },
      },
      accountImports: {
        async getActiveRunForAccount(_userId, accountId) {
          return activeByAccount.get(accountId) ?? null;
        },
      },
      commands: {
        createAutomaticRefreshForUser: command,
      },
    },
    {
      now: () => new Date(NOW.getTime()),
      ...(retryBaseMs ? { retryBaseMs } : {}),
      ...(retryMaxMs ? { retryMaxMs } : {}),
    },
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