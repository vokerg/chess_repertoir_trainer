import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';
import { AccountImportAutomaticRefreshRepository } from '../../dist/modules/account-imports/account-import.automatic-refresh.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
const canonical = canonicalizeAccountImportScope(scope);
const HOUR = 60 * 60 * 1_000;
const MINUTE = 60 * 1_000;
const NOW = new Date('2026-08-31T18:00:00.000Z');
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-025 automatic policy',
      authProvider: 'test',
      authSubject: `onb-025-policy-${suffix}`,
    },
  });
  userId = user.id;

  const fresh = await createCoveredAccount(user.id, 'fresh', 23 * HOUR);
  const freshDecision = await evaluate(user.id, fresh.account.id);
  assert.equal(freshDecision.kind, 'fresh');
  assert.equal(
    freshDecision.nextEligibleAt.toISOString(),
    new Date(NOW.getTime() + HOUR).toISOString(),
  );

  const boundary = await createCoveredAccount(user.id, 'boundary', 24 * HOUR);
  const boundaryDecision = await evaluate(user.id, boundary.account.id);
  assert.equal(boundaryDecision.kind, 'accepted');
  assert.equal(boundaryDecision.run.mode, 'INCREMENTAL_FORWARD');
  assert.equal(boundaryDecision.run.priority, 10);

  const throttled = await createCoveredAccount(user.id, 'throttled', 25 * HOUR);
  await createAutomaticFailure(user.id, throttled.account.id, NOW.getTime() - 20 * MINUTE);
  await createAutomaticFailure(user.id, throttled.account.id, NOW.getTime() - 9 * MINUTE);
  const throttledDecision = await evaluate(user.id, throttled.account.id, 5 * MINUTE, 20 * MINUTE);
  assert.equal(throttledDecision.kind, 'retryThrottled');
  assert.equal(
    throttledDecision.retryAt.toISOString(),
    new Date(NOW.getTime() + MINUTE).toISOString(),
  );

  const retryBoundary = await createCoveredAccount(user.id, 'retry-boundary', 25 * HOUR);
  await createAutomaticFailure(user.id, retryBoundary.account.id, NOW.getTime() - 20 * MINUTE);
  const retrySource = await createAutomaticFailure(
    user.id,
    retryBoundary.account.id,
    NOW.getTime() - 10 * MINUTE,
  );
  const retryDecision = await evaluate(
    user.id,
    retryBoundary.account.id,
    5 * MINUTE,
    20 * MINUTE,
  );
  assert.equal(retryDecision.kind, 'accepted');
  assert.equal(retryDecision.run.retryOfImportRunId, retrySource.id);
  assert.equal(retryDecision.run.priority, 10);
} finally {
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}

console.log('Automatic account refresh policy integration tests passed.');

async function evaluate(ownerId, accountId, retryBaseMs = 15 * MINUTE, retryMaxMs = 6 * HOUR) {
  return AccountImportAutomaticRefreshRepository.evaluateAndAccept(ownerId, accountId, {
    evaluatedAt: new Date(NOW.getTime()),
    cooldownMs: 24 * HOUR,
    retryBaseMs,
    retryMaxMs,
  });
}

async function createCoveredAccount(ownerId, label, successAgeMs) {
  const account = await prisma.externalAccount.create({
    data: {
      userId: ownerId,
      provider: 'LICHESS',
      username: `onb-025-${label}-${suffix}`,
      isActive: true,
    },
  });
  const completedAt = new Date(NOW.getTime() - successAgeMs);
  const coveredThrough = new Date(completedAt.getTime() - HOUR);
  const coveredFrom = new Date(coveredThrough.getTime() - 24 * HOUR);
  const createdAt = new Date(coveredFrom.getTime() - HOUR);
  const run = await prisma.importRun.create({
    data: {
      userId: ownerId,
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
      completedAt,
      createdAt,
    },
  });
  const coverage = await prisma.accountImportCoverage.create({
    data: {
      accountId: account.id,
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      coveredFrom,
      coveredThrough,
      lastCompletedImportRunId: run.id,
      createdAt,
    },
  });
  return { account, coverage, run };
}

async function createAutomaticFailure(ownerId, accountId, completedAtMs) {
  const account = await prisma.externalAccount.findUniqueOrThrow({ where: { id: accountId } });
  const completedAt = new Date(completedAtMs);
  return prisma.importRun.create({
    data: {
      userId: ownerId,
      accountId,
      provider: account.provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'FAILED',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom: new Date(completedAt.getTime() - HOUR),
      requestedTo: completedAt,
      priority: 10,
      completedAt,
      errorCode: 'PROVIDER_TEMPORARY',
      error: 'Temporary provider failure.',
    },
  });
}
