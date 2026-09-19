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
const NOW = new Date('2026-08-31T18:00:00.000Z');
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-025 admission races',
      authProvider: 'test',
      authSubject: `onb-025-races-${suffix}`,
    },
  });
  userId = user.id;

  await verifyDeactivationWins(user.id);
  await verifyCompletedRefreshWins(user.id);
} finally {
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}

console.log('Automatic account refresh admission race integration tests passed.');

async function verifyDeactivationWins(ownerId) {
  const { account } = await createCoveredAccount(ownerId, 'deactivate');
  const locked = deferred();
  const release = deferred();

  const deactivation = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ExternalAccount" WHERE "id" = ${account.id} FOR UPDATE`;
    await tx.externalAccount.update({ where: { id: account.id }, data: { isActive: false } });
    locked.resolve();
    await release.promise;
  });

  await locked.promise;
  const decisionPromise = AccountImportAutomaticRefreshRepository.evaluateAndAccept(
    ownerId,
    account.id,
    admissionOptions(),
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  release.resolve();

  await deactivation;
  const decision = await decisionPromise;
  assert.equal(decision.kind, 'inactive');
  assert.equal(
    await prisma.importRun.count({
      where: {
        accountId: account.id,
        status: { in: ['QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'CANCEL_REQUESTED'] },
      },
    }),
    0,
    'automatic admission must re-check isActive after waiting for the account lock',
  );
}

async function verifyCompletedRefreshWins(ownerId) {
  const { account, coverage } = await createCoveredAccount(ownerId, 'fresh-race');
  const requestedFrom = coverage.coveredThrough;
  const requestedTo = new Date(NOW.getTime() - HOUR);
  const competing = await prisma.importRun.create({
    data: {
      userId: ownerId,
      accountId: account.id,
      provider: account.provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'RUNNING',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom,
      requestedTo,
      priority: 100,
      workKey: `onb-025-race-${suffix}`,
      claimedAt: new Date(NOW.getTime() - 2 * HOUR),
      heartbeatAt: new Date(NOW.getTime() - 2 * HOUR),
    },
  });

  const locked = deferred();
  const release = deferred();
  const completion = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ExternalAccount" WHERE "id" = ${account.id} FOR UPDATE`;
    await tx.accountImportCoverage.update({
      where: { id: coverage.id },
      data: {
        coveredThrough: requestedTo,
        lastCompletedImportRunId: competing.id,
      },
    });
    await tx.importRun.update({
      where: { id: competing.id },
      data: {
        status: 'COMPLETED',
        workKey: null,
        claimedAt: null,
        heartbeatAt: null,
        completedAt: new Date(NOW.getTime() - 30 * 60 * 1_000),
      },
    });
    locked.resolve();
    await release.promise;
  });

  await locked.promise;
  const decisionPromise = AccountImportAutomaticRefreshRepository.evaluateAndAccept(
    ownerId,
    account.id,
    admissionOptions(),
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  release.resolve();

  await completion;
  const decision = await decisionPromise;
  assert.equal(decision.kind, 'fresh');
  assert.equal(
    await prisma.importRun.count({
      where: {
        accountId: account.id,
        status: { in: ['QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'CANCEL_REQUESTED'] },
      },
    }),
    0,
    'a refresh that completes before durable automatic admission must suppress redundant work',
  );
}

async function createCoveredAccount(ownerId, label) {
  const account = await prisma.externalAccount.create({
    data: {
      userId: ownerId,
      provider: 'LICHESS',
      username: `onb-025-${label}-${suffix}`,
      isActive: true,
    },
  });
  const completedAt = new Date(NOW.getTime() - 30 * HOUR);
  const coveredThrough = new Date(completedAt.getTime() - HOUR);
  const coveredFrom = new Date(coveredThrough.getTime() - 24 * HOUR);
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
      createdAt: new Date(coveredFrom.getTime() - HOUR),
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
      createdAt: new Date(coveredFrom.getTime() - HOUR),
    },
  });
  return { account, coverage };
}

function admissionOptions() {
  return {
    evaluatedAt: new Date(NOW.getTime()),
    cooldownMs: 24 * HOUR,
    retryBaseMs: 15 * 60 * 1_000,
    retryMaxMs: 6 * HOUR,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
