import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';
import {
  createPreparationReconcilerRepository,
} from '../../dist/modules/preparation/preparation-reconciler.repository.prisma.js';
import {
  createPreparationRepository,
} from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const importRepository = createAccountImportRepository(prisma);
const preparationRepository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const reconcilerA = createPreparationReconcilerRepository(prisma);
const reconcilerB = createPreparationReconcilerRepository(prisma);
const suffix = randomUUID();
const userIds = [];
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  await provePersistedWakeHintsAndSingleParentClaim();
  await proveChildSettlementWakeHint();
  await proveRetentionSnapshotAndWakeHint();
  await proveLargeAccountQueueBound();
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function provePersistedWakeHintsAndSingleParentClaim() {
  const owner = await createOwner('wake');
  const importRun = await createImport(owner);
  const preparation = await createPreparation(owner, null, 'a');
  const future = new Date(Date.now() + 60_000);

  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: future },
  });
  await prisma.dataPreparationTarget.update({
    where: { id: preparation.targets[0].id },
    data: { currentImportRunId: importRun.id },
  });
  let run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(run.reconcileAfter instanceof Date);
  assert.ok(
    run.reconcileAfter.getTime() < future.getTime(),
    'linking the current import persists an immediate preparation wake hint',
  );

  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: future },
  });
  const beforeProgress = Date.now();
  await prisma.importRun.update({
    where: { id: importRun.id },
    data: { gamesImported: { increment: 1 }, lastProgressAt: new Date() },
  });
  run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(run.reconcileAfter instanceof Date);
  assert.ok(
    run.reconcileAfter.getTime() >= beforeProgress - 1_000
      && run.reconcileAfter.getTime() < future.getTime(),
    'committed import progress moves the linked preparation run due immediately',
  );

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 5_000);
  const claims = await Promise.all([
    reconcilerA.claimNextDueRun(now, leaseUntil),
    reconcilerB.claimNextDueRun(now, leaseUntil),
  ]);
  assert.equal(claims.filter(Boolean).length, 1, 'two reconcilers cannot claim the same parent');
  assert.equal(claims.filter((claim) => claim === null).length, 1);
  assert.equal(claims.find(Boolean).id, preparation.run.id);

  await retirePreparationRun(preparation.run.id);
}

async function proveChildSettlementWakeHint() {
  const owner = await createOwner('child');
  const importRun = await createImport(owner);
  const preparation = await createPreparation(owner, importRun.id, 'b');
  const game = await prisma.importedGame.create({
    data: {
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `onb-018-child-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  });
  const admission = await preparationRepository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: preparation.run.id,
    targetId: preparation.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(admission.outcome, 'CREATED');
  assert.deepEqual(admission.importedGameIds, [game.id]);

  const future = new Date(Date.now() + 60_000);
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: future },
  });
  const beforeSettlement = Date.now();
  await prisma.jobTask.updateMany({
    where: { jobRunId: admission.jobRunId },
    data: { status: 'CANCELLED', settledAt: new Date() },
  });
  const run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(run.reconcileAfter instanceof Date);
  assert.ok(
    run.reconcileAfter.getTime() >= beforeSettlement - 1_000
      && run.reconcileAfter.getTime() < future.getTime(),
    'child task settlement persists an immediate preparation wake hint',
  );
  await prisma.jobRun.update({
    where: { id: admission.jobRunId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });

  await retirePreparationRun(preparation.run.id);
}

async function proveRetentionSnapshotAndWakeHint() {
  const owner = await createOwner('retention');
  const importRun = await createImport(owner);
  const preparation = await createPreparation(owner, importRun.id, 'c');
  await createGame(owner, 'retention');
  const admission = await preparationRepository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: preparation.run.id,
    targetId: preparation.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(admission.outcome, 'CREATED');

  const settledAt = new Date();
  await prisma.jobTask.updateMany({
    where: { jobRunId: admission.jobRunId },
    data: { status: 'COMPLETED', settledAt },
  });
  await prisma.jobRun.update({
    where: { id: admission.jobRunId },
    data: { status: 'COMPLETED', startedAt: settledAt, completedAt: settledAt },
  });

  const future = new Date(Date.now() + 60_000);
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: future },
  });
  const beforeRetention = Date.now();
  await prisma.jobRun.delete({ where: { id: admission.jobRunId } });

  const batch = await prisma.dataPreparationBatch.findUniqueOrThrow({
    where: { id: admission.batchId },
    select: {
      jobRunId: true,
      status: true,
      completedTasks: true,
      settledAt: true,
    },
  });
  assert.equal(batch.jobRunId, null, 'retention clears only the child link');
  assert.equal(batch.status, 'COMPLETED');
  assert.equal(batch.completedTasks, 1, 'terminal child counts survive retention deletion');
  assert.ok(batch.settledAt instanceof Date);

  const run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(run.reconcileAfter instanceof Date);
  assert.ok(
    run.reconcileAfter.getTime() >= beforeRetention - 1_000
      && run.reconcileAfter.getTime() < future.getTime(),
    'retention deletion wakes the parent after snapshotting terminal child evidence',
  );

  await retirePreparationRun(preparation.run.id);
}

async function proveLargeAccountQueueBound() {
  const owner = await createOwner('large');
  const importRun = await createImport(owner);
  const preparation = await createPreparation(owner, importRun.id, 'd');
  await prisma.importedGame.createMany({
    data: Array.from({ length: 250 }, (_, index) => ({
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `onb-018-large-${index}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: index % 2 === 0 ? 'blitz' : 'rapid',
      endedAt: new Date(Date.UTC(2026, 6, 1, 0, 0, index % 60)),
    })),
  });

  const reconciler = createPreparationReconciler({
    repository: createPreparationReconcilerRepository(prisma),
    batchRepository: preparationRepository,
    importRepository: {
      requestPause: async () => true,
      resume: async () => true,
      requestCancel: async () => true,
    },
    jobControl: { cancelForUser: async () => null },
    config: DEFAULT_PREPARATION_CONFIG,
    logger: { info() {}, warn() {}, error() {} },
  });
  const result = await reconciler.reconcileOnce();
  assert.equal(result.claimed, true);
  assert.equal(result.runId, preparation.run.id);

  const batches = await prisma.dataPreparationBatch.findMany({
    where: { preparationRunId: preparation.run.id },
    select: { stage: true, totalTasks: true, jobRunId: true },
    orderBy: { ordinal: 'asc' },
  });
  assert.equal(batches.length, 1, 'one reconcile does not materialize account-sized backlog');
  assert.equal(batches[0].stage, 'INDEX');
  assert.equal(batches[0].totalTasks, DEFAULT_PREPARATION_CONFIG.firstIndexBatchSize);
  assert.ok(batches[0].jobRunId !== null);
  assert.equal(
    await prisma.jobTask.count({ where: { jobRunId: batches[0].jobRunId } }),
    DEFAULT_PREPARATION_CONFIG.firstIndexBatchSize,
    'large-account queue materialization remains bounded by the configured wave size',
  );
}

function createGame(owner, label) {
  return prisma.importedGame.create({
    data: {
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `onb-018-${label}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  });
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `ONB-018 ${label}`,
      authProvider: 'test',
      authSubject: `onb-018-${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-018-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

function createImport(owner) {
  return importRepository.createRun({
    userId: owner.userId,
    accountId: owner.accountId,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom,
    requestedTo,
    priority: 100,
    windowsTotal: 1,
  });
}

function createPreparation(owner, currentImportRunId, hashCharacter) {
  return preparationRepository.createRun({
    userId: owner.userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: owner.accountId },
    targets: [{
      accountId: owner.accountId,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: hashCharacter.repeat(64),
      scope: {
        rated: 'ANY',
        speedCategories: ['BLITZ', 'RAPID'],
        variants: ['STANDARD'],
      },
      requestedFrom,
      requestedTo,
      currentImportRunId,
    }],
  });
}

function retirePreparationRun(runId) {
  return prisma.dataPreparationRun.update({
    where: { id: runId },
    data: {
      status: 'COMPLETED',
      reconcileAfter: null,
      completedAt: new Date(),
    },
  });
}
