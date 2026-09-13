import assert from 'node:assert/strict';
import {
  accountGameDataLifecycleActionSchema,
  accountGameDataLifecyclePreviewRequestSchema,
  dataLifecycleActionSchema,
  dataLifecycleErrorCodeSchema,
  dataLifecycleExecuteRequestSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecycleOperationStatusSchema,
  dataLifecyclePreviewCountsSchema,
  dataLifecyclePreviewResponseSchema,
  dataLifecycleResourceTypeSchema,
  dataLifecycleScopeSchema,
  dataLifecycleStopRequestSchema,
  dataLifecycleTerminalResultSchema,
  importedGameOpeningProvenanceSchema,
  wholeUserDataLifecyclePreviewRequestSchema,
  wholeUserDataLifecycleExecuteResponseSchema,
  dataLifecycleReceiptStatusRequestSchema,
  dataLifecycleReceiptStatusResponseSchema,
  dataLifecycleIdentityBlockedResponseSchema,
} from '../dist/data-lifecycle/index.js';

for (const action of [
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
  'DELETE_APP_USER',
]) {
  assert.equal(dataLifecycleActionSchema.parse(action), action);
}

for (const action of [
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
]) {
  assert.equal(accountGameDataLifecycleActionSchema.parse(action), action);
}
assert.equal(accountGameDataLifecycleActionSchema.safeParse('DELETE_APP_USER').success, false);

assert.equal(dataLifecycleOperationStatusSchema.parse('NEEDS_ATTENTION'), 'NEEDS_ATTENTION');
assert.equal(dataLifecycleResourceTypeSchema.parse('GAME'), 'GAME');
assert.equal(dataLifecycleStopRequestSchema.parse('STOP_AFTER_BATCH'), 'STOP_AFTER_BATCH');
assert.equal(dataLifecycleTerminalResultSchema.parse('CANCELLED_BEFORE_MUTATION'), 'CANCELLED_BEFORE_MUTATION');
assert.equal(dataLifecycleErrorCodeSchema.parse('DATA_LIFECYCLE_WRITE_BLOCKED'), 'DATA_LIFECYCLE_WRITE_BLOCKED');
assert.equal(dataLifecycleErrorCodeSchema.parse('DATA_LIFECYCLE_SCOPE_VIOLATION'), 'DATA_LIFECYCLE_SCOPE_VIOLATION');
assert.equal(importedGameOpeningProvenanceSchema.parse('LOCAL_BOOK'), 'LOCAL_BOOK');

assert.deepEqual(dataLifecycleScopeSchema.parse({
  resourceType: 'GAME',
  userId: 4,
  accountId: 12,
  gameIds: [90, 91],
}), {
  resourceType: 'GAME',
  userId: 4,
  accountId: 12,
  gameIds: [90, 91],
});
assert.equal(
  dataLifecycleScopeSchema.safeParse({
    resourceType: 'GAME',
    userId: 4,
    accountId: 12,
    gameIds: Array.from({ length: 101 }, (_, index) => index + 1),
  }).success,
  false,
);
assert.equal(dataLifecycleScopeSchema.safeParse({ resourceType: 'ACCOUNT', userId: 4 }).success, false);

const counts = {
  accounts: 1,
  games: 24,
  plies: 1_932,
  analysisRuns: 18,
  aiReviews: 2,
  tacticalDetections: 9,
  scenarioSessions: 3,
  importRuns: 4,
  jobRuns: 7,
  preparationRuns: 1,
};
assert.deepEqual(dataLifecyclePreviewCountsSchema.parse(counts), counts);
assert.equal(dataLifecyclePreviewCountsSchema.safeParse({ ...counts, games: -1 }).success, false);

assert.deepEqual(accountGameDataLifecyclePreviewRequestSchema.parse({
  action: 'UNINDEX_GAMES',
  accountId: 12,
  gameIds: [90, 91],
}), {
  action: 'UNINDEX_GAMES',
  accountId: 12,
  gameIds: [90, 91],
});
assert.deepEqual(accountGameDataLifecyclePreviewRequestSchema.parse({
  action: 'PURGE_ACCOUNT_DATA',
  accountId: 12,
}), {
  action: 'PURGE_ACCOUNT_DATA',
  accountId: 12,
});
assert.equal(accountGameDataLifecyclePreviewRequestSchema.safeParse({
  action: 'UNANALYSE_GAMES',
  accountId: 12,
}).success, false);
assert.equal(accountGameDataLifecyclePreviewRequestSchema.safeParse({
  action: 'DELETE_EXTERNAL_ACCOUNT',
  accountId: 12,
  gameIds: [90],
}).success, false);

assert.deepEqual(wholeUserDataLifecyclePreviewRequestSchema.parse({
  action: 'DELETE_APP_USER',
}), {
  action: 'DELETE_APP_USER',
});
assert.equal(wholeUserDataLifecyclePreviewRequestSchema.safeParse({
  action: 'DELETE_EXTERNAL_ACCOUNT',
}).success, false);

assert.deepEqual(dataLifecycleExecuteRequestSchema.parse({
  previewToken: '0123456789abcdef0123456789abcdef',
  confirmationPhrase: 'DELETE ACCOUNT 12',
  idempotencyKey: 'delete-account-12-request-1',
}), {
  previewToken: '0123456789abcdef0123456789abcdef',
  confirmationPhrase: 'DELETE ACCOUNT 12',
  idempotencyKey: 'delete-account-12-request-1',
});

const operation = {
  operationId: 44,
  action: 'PURGE_ACCOUNT_DATA',
  status: 'WAITING_FOR_DRAIN',
  scope: { resourceType: 'ACCOUNT', userId: 4, accountId: 12 },
  previewCounts: counts,
  previewExpiresAt: '2026-09-01T08:00:00.000Z',
  confirmationPhrase: 'PURGE ACCOUNT 12',
  warningCodes: ['DESTRUCTIVE_OPERATION'],
  stopRequest: 'NONE',
  firstDestructiveCommitAt: null,
  checkpoint: null,
  verification: null,
  terminalResult: null,
  errorCode: null,
  startedAt: '2026-09-01T07:50:00.000Z',
  completedAt: null,
  createdAt: '2026-09-01T07:45:00.000Z',
  updatedAt: '2026-09-01T07:51:00.000Z',
};
assert.deepEqual(dataLifecycleOperationResponseSchema.parse(operation), operation);
assert.deepEqual(dataLifecyclePreviewResponseSchema.parse({
  ...operation,
  status: 'PREVIEWED',
  startedAt: null,
  previewToken: '0123456789abcdef0123456789abcdef',
}), {
  ...operation,
  status: 'PREVIEWED',
  startedAt: null,
  previewToken: '0123456789abcdef0123456789abcdef',
});

const userOperation = {
  ...operation,
  action: 'DELETE_APP_USER',
  scope: { resourceType: 'USER', userId: 4 },
};
assert.deepEqual(wholeUserDataLifecycleExecuteResponseSchema.parse({
  ...userOperation,
  receiptToken: 'udr_0123456789abcdef',
}), {
  ...userOperation,
  receiptToken: 'udr_0123456789abcdef',
});
assert.deepEqual(dataLifecycleReceiptStatusRequestSchema.parse({
  receiptToken: 'udr_0123456789abcdef',
}), {
  receiptToken: 'udr_0123456789abcdef',
});
assert.deepEqual(dataLifecycleReceiptStatusResponseSchema.parse({
  operationId: 44,
  action: 'DELETE_APP_USER',
  status: 'COMPLETED',
  terminalResult: 'COMPLETED',
  completedAt: '2026-09-01T08:00:00.000Z',
  purgeLocalData: true,
}), {
  operationId: 44,
  action: 'DELETE_APP_USER',
  status: 'COMPLETED',
  terminalResult: 'COMPLETED',
  completedAt: '2026-09-01T08:00:00.000Z',
  purgeLocalData: true,
});
assert.deepEqual(dataLifecycleIdentityBlockedResponseSchema.parse({
  error: 'Application account deletion is in progress.',
  code: 'DATA_LIFECYCLE_DELETION_IN_PROGRESS',
  operationId: 44,
  purgeLocalData: true,
}), {
  error: 'Application account deletion is in progress.',
  code: 'DATA_LIFECYCLE_DELETION_IN_PROGRESS',
  operationId: 44,
  purgeLocalData: true,
});

console.log('Data lifecycle contract tests passed.');
