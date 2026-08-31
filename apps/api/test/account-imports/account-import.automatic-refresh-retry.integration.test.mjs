import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';
import { AccountImportAutomaticRefreshService } from '../../dist/modules/account-imports/account-import.automatic-refresh.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
const canonical = canonicalizeAccountImportScope(scope);
const HOUR = 60 * 60 * 1_000;
const MINUTE = 60 * 1_000;
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-025 automatic retry',
      authProvider: 'test',
      authSubject: `onb-025-retry-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-025-retry-${suffix}`,
      isActive: true,
    },
  });

  const successfulCompletedAt = new Date(Date.now() - 25 * HOUR);
  const coveredThrough = new Date(successfulCompletedAt.getTime() - HOUR);
  const coveredFrom = new Date(coveredThrough.getTime() - 24 * HOUR);
  const coverageCreatedAt = new Date(coveredFrom.getTime() - HOUR);
  const successfulRun = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: account.provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'COMPLETED',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom: coveredFrom,
      requestedTo: coveredThrough,
      priority: 100,
      completedAt: successfulCompletedAt,
      createdAt: coverageCreatedAt,
    },
  });
  await prisma.accountImportCoverage.create({
    data: {
      accountId: account.id,
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      coveredFrom,
      coveredThrough,
      lastCompletedImportRunId: successfulRun.id,
      createdAt: coverageCreatedAt,
    },
  });

  const failedCompletedAt = new Date(Date.now() - 16 * MINUTE);
  const failedRequestedTo = new Date(failedCompletedAt.getTime() - MINUTE);
  const failed = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: account.provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'FAILED',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom: coveredThrough,
      requestedTo: failedRequestedTo,
      priority: 10,
      completedAt: failedCompletedAt,
      errorCode: 'PROVIDER_TEMPORARY',
      error: 'Temporary provider failure.',
    },
  });

  const preparation = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'EXPANSION',
      status: 'NEEDS_ATTENTION',
      recipeVersion: 1,
      recipeJson: { kind: 'ACCOUNT_IMPORT_EXPANSION', importRunIds: [failed.id] },
    },
  });
  await prisma.dataPreparationTarget.create({
    data: {
      preparationRunId: preparation.id,
      accountId: account.id,
      accountProvider: account.provider,
      accountUsername: account.username,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: 'b'.repeat(64),
      scopeJson: { rated: 'ANY', speedCategories: ['BLITZ', 'RAPID'], variants: ['STANDARD'] },
      requestedFrom: failed.requestedFrom,
      requestedTo: failed.requestedTo,
      currentImportRunId: failed.id,
    },
  });

  const result = await AccountImportAutomaticRefreshService.refreshForUser(user.id);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, 'accepted');
  assert.equal(result.items[0].importRun.retryOfImportRunId, failed.id);
  assert.equal(result.items[0].importRun.priority, 10);
  assert.equal(result.items[0].importRun.requestedFrom, failed.requestedFrom.toISOString());
  assert.equal(result.items[0].importRun.requestedTo, failed.requestedTo.toISOString());

  const retry = await prisma.importRun.findUniqueOrThrow({
    where: { id: result.items[0].importRun.id },
  });
  assert.equal(retry.retryOfImportRunId, failed.id);
  assert.equal(retry.priority, 10);
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}

console.log('Automatic account refresh failed-lineage retry integration test passed.');
