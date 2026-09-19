import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { AccountImportService } from '../../dist/modules/account-imports/account-import.service.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconcilerRepository } from '../../dist/modules/preparation/preparation-reconciler.repository.prisma.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';
import { createPreparationRepository } from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const importRepository = createAccountImportRepository(prisma);
const preparationRepository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const reconcilerRepository = createPreparationReconcilerRepository(prisma);
const suffix = randomUUID();
let userId;

const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-018 import attention recovery',
      authProvider: 'test',
      authSubject: `onb-018-import-attention-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `onb-018-import-attention-${suffix}`,
    },
  });

  const failedImport = await importRepository.createRun({
    userId,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope,
    requestedFrom,
    requestedTo,
    priority: 100,
    windowsTotal: 1,
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
      scopeHash: 'e'.repeat(64),
      scope: {
        rated: 'ANY',
        speedCategories: ['BLITZ', 'RAPID'],
        variants: ['STANDARD'],
      },
      requestedFrom,
      requestedTo,
      currentImportRunId: failedImport.id,
    }],
  });

  await prisma.importRun.update({
    where: { id: failedImport.id },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorCode: 'TEST_FAILURE',
    },
  });
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'IMPORT_RETRY_AVAILABLE',
      attentionDetail: 'Linked import is failed.',
      reconcileAfter: null,
    },
  });

  const retried = await AccountImportService.retryForUser(userId, failedImport.id);
  const beforeLink = Date.now();
  await prisma.dataPreparationTarget.update({
    where: { id: preparation.targets[0].id },
    data: { currentImportRunId: retried.importRun.id },
  });

  let run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { status: true, attentionCode: true, reconcileAfter: true },
  });
  assert.equal(run.status, 'NEEDS_ATTENTION');
  assert.equal(run.attentionCode, 'IMPORT_RETRY_AVAILABLE');
  assert.ok(run.reconcileAfter instanceof Date);
  assert.ok(
    run.reconcileAfter.getTime() >= beforeLink - 1_000,
    'linking a latest import attempt durably wakes a recoverable attention parent',
  );

  // Keep this assertion independent from other preparation fixtures sharing the CI database.
  await prisma.dataPreparationRun.update({
    where: { id: preparation.run.id },
    data: { reconcileAfter: new Date('1999-01-01T00:00:00.000Z') },
  });

  const reconciler = createPreparationReconciler({
    repository: reconcilerRepository,
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
  assert.equal(result.status, 'RUNNING');

  run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { status: true, attentionCode: true, attentionDetail: true, reconcileAfter: true },
  });
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.attentionCode, null);
  assert.equal(run.attentionDetail, null);
  assert.ok(run.reconcileAfter instanceof Date);

  console.log('Preparation import-attention recovery tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
