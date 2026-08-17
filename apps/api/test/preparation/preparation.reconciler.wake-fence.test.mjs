import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconcilerRepository } from '../../dist/modules/preparation/preparation-reconciler.repository.prisma.js';
import { createPreparationRepository } from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const importRepository = createAccountImportRepository(prisma);
const preparationRepository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const reconcilerRepository = createPreparationReconcilerRepository(prisma);
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-018 wake fence',
      authProvider: 'test',
      authSubject: `onb-018-wake-fence-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `onb-018-wake-fence-${suffix}`,
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
  const preparation = await preparationRepository.createRun({
    userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: account.id },
    targets: [{
      accountId: account.id,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: '9'.repeat(64),
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
      status: 'RUNNING',
      reconcileAfter: new Date('1900-01-01T00:00:00.000Z'),
    },
  });

  const now = new Date('2026-08-16T08:00:00.000Z');
  const leaseUntil = new Date(now.getTime() + 15_000);
  const claim = await reconcilerRepository.claimNextDueRun(now, leaseUntil);
  assert.equal(claim?.id, preparation.run.id);
  const snapshot = await reconcilerRepository.loadSnapshot(preparation.run.id);
  assert.ok(snapshot);
  assert.equal(snapshot.run.status, 'RUNNING');
  assert.equal(snapshot.run.reconcileAfter?.getTime(), leaseUntil.getTime());

  const beforeWake = Date.now();
  await prisma.importRun.update({
    where: { id: importRun.id },
    data: {
      gamesImported: { increment: 1 },
      lastProgressAt: new Date(),
    },
  });
  const woken = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { reconcileAfter: true },
  });
  assert.ok(woken.reconcileAfter instanceof Date);
  assert.ok(woken.reconcileAfter.getTime() >= beforeWake - 1_000);
  assert.notEqual(woken.reconcileAfter.getTime(), leaseUntil.getTime());

  const applied = await reconcilerRepository.applyState({
    runId: preparation.run.id,
    expectedStatus: snapshot.run.status,
    expectedReconcileAfter: snapshot.run.reconcileAfter,
    status: 'COMPLETED',
    attentionCode: null,
    attentionDetail: null,
    reconcileAfter: null,
    markFirstImported: false,
    markFirstIndexed: false,
    markFirstAnalysed: false,
    markCoreReady: false,
    markAnalysisCompleted: false,
    targetMilestones: [],
  });
  assert.equal(
    applied,
    false,
    'a durable wake invalidates a stale reconcile decision even when lifecycle status is unchanged',
  );

  const run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: preparation.run.id },
    select: { status: true, reconcileAfter: true },
  });
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.reconcileAfter?.getTime(), woken.reconcileAfter.getTime());

  console.log('Preparation durable wake-fence tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
