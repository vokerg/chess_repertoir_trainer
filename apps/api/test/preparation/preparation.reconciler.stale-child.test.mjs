import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { createJobWorkerRepository } from '../../dist/modules/jobs/job-worker.repository.prisma.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconcilerRepository } from '../../dist/modules/preparation/preparation-reconciler.repository.prisma.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';
import { createPreparationRepository } from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const importRepository = createAccountImportRepository(prisma);
const preparationRepository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const jobWorkerRepository = createJobWorkerRepository(prisma);
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-018 stale child recovery',
      authProvider: 'test',
      authSubject: `onb-018-stale-child-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `onb-018-stale-child-${suffix}`,
    },
  });
  const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
  const requestedTo = new Date('2026-08-01T00:00:00.000Z');
  const importRun = await importRepository.createRun({
    userId,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom,
    requestedTo,
    priority: 100,
    windowsTotal: 1,
  });
  await prisma.importRun.update({
    where: { id: importRun.id },
    data: {
      status: 'COMPLETED',
      windowsCompleted: 1,
      completedAt: new Date(),
      workKey: null,
    },
  });
  await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `onb-018-stale-child-${suffix}`,
      pgn: '1. d4 d5',
      rated: true,
      variant: 'standard',
      speedCategory: 'rapid',
      endedAt: new Date('2026-07-02T00:00:00.000Z'),
    },
  });
  const preparation = await preparationRepository.createRun({
    userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: account.id },
    targets: [{
      accountId: account.id,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: '8'.repeat(64),
      scope: {
        rated: 'ANY',
        speedCategories: ['BLITZ', 'RAPID'],
        variants: ['STANDARD'],
      },
      requestedFrom,
      requestedTo,
      currentImportRunId: importRun.id,
    }],
  });
  const admission = await preparationRepository.admitNextBatch({
    userId,
    preparationRunId: preparation.run.id,
    targetId: preparation.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(admission.outcome, 'CREATED');

  const claim = await jobWorkerRepository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: admission.jobRunId,
  });
  assert.ok(claim);
  await prisma.jobTask.update({
    where: { id: claim.id },
    data: { updatedAt: new Date('2000-01-01T00:00:00.000Z') },
  });
  const future = new Date(Date.now() + 60_000);
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: future },
  });

  // A fresh worker instance after process restart recovers the stale child claim.
  const restartedJobRepository = createJobWorkerRepository(prisma);
  const recovered = await restartedJobRepository.recoverStaleTasks(new Date());
  assert.ok(recovered >= 1);
  const task = await prisma.jobTask.findUniqueOrThrow({
    where: { id: claim.id },
    select: { status: true, workKey: true },
  });
  assert.equal(task.status, 'QUEUED');
  assert.equal(task.workKey, null);

  const woken = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(woken.reconcileAfter instanceof Date);
  assert.ok(
    woken.reconcileAfter.getTime() < future.getTime(),
    'stale-child recovery durably wakes the preparation parent',
  );

  // Isolate this parent from other preparation fixtures, then reconcile from a
  // fresh service instance. The retained active batch must prevent duplication.
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: new Date('1800-01-01T00:00:00.000Z') },
  });
  const restartedReconciler = createPreparationReconciler({
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
  const result = await restartedReconciler.reconcileOnce();
  assert.equal(result.claimed, true);
  assert.equal(result.runId, preparation.run.id);
  assert.equal(
    await prisma.dataPreparationBatch.count({
      where: { preparationRunId: preparation.run.id, stage: 'INDEX' },
    }),
    1,
    'restart reconciliation reuses the recovered child batch instead of duplicating it',
  );

  console.log('Preparation stale-child restart tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
