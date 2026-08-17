import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconcilerRepository } from '../../dist/modules/preparation/preparation-reconciler.repository.prisma.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';
import { createPreparationRepository } from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const importRepository = createAccountImportRepository(prisma);
const preparationRepository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const suffix = randomUUID();
let userId;

const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-018 atomic retry',
      authProvider: 'test',
      authSubject: `onb-018-atomic-retry-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `onb-018-atomic-retry-${suffix}`,
    },
  });
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
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `onb-018-atomic-retry-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date('2026-07-01T00:00:00.000Z'),
      plyIndexError: 'TEST_INDEX_FAILURE',
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
      scopeHash: 'f'.repeat(64),
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
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'ALL_INDEXING_FAILED',
      attentionDetail: 'Every eligible imported game has a terminal indexing failure.',
      reconcileAfter: null,
    },
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

  const generation = await reconciler.retry(userId, preparation.run.id);
  assert.equal(generation, 1);

  const [run, batches] = await Promise.all([
    prisma.dataPreparationRun.findUniqueOrThrow({
      where: { id: preparation.run.id },
      select: {
        status: true,
        retryGeneration: true,
        attentionCode: true,
        attentionDetail: true,
        reconcileAfter: true,
      },
    }),
    prisma.dataPreparationBatch.findMany({
      where: { preparationRunId: preparation.run.id },
      select: {
        id: true,
        stage: true,
        lane: true,
        status: true,
        jobRunId: true,
        totalTasks: true,
      },
    }),
  ]);
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.retryGeneration, 1);
  assert.equal(run.attentionCode, null);
  assert.equal(run.attentionDetail, null);
  assert.ok(run.reconcileAfter instanceof Date);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].stage, 'INDEX');
  assert.equal(batches[0].lane, 'RETRY');
  assert.equal(batches[0].status, 'QUEUED');
  assert.equal(batches[0].totalTasks, 1);
  assert.ok(batches[0].jobRunId !== null);

  const tasks = await prisma.jobTask.findMany({
    where: { jobRunId: batches[0].jobRunId },
    select: { importedGameId: true, status: true },
  });
  assert.deepEqual(tasks, [{ importedGameId: game.id, status: 'QUEUED' }]);

  console.log('Preparation atomic retry generation tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
