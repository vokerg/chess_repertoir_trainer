import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  createOnboardingCommandService,
  OnboardingCommandNotFoundError,
} from '../../dist/modules/onboarding/onboarding-command.service.js';
import { createOnboardingCommandAdmissionRepository } from '../../dist/modules/onboarding/onboarding-command-admission.repository.prisma.js';
import { createOnboardingCommandRepository } from '../../dist/modules/onboarding/onboarding-command.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const now = new Date('2026-08-31T12:00:00.000Z');
const users = [];
// Keep command transactions on an independent pool because the full integration
// runner loads many Prisma-backed fixtures into one Node process.
const commandPrisma = new PrismaClient();

async function createUser(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: label,
      authProvider: 'test',
      authSubject: `${label.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
    },
  });
  users.push(user);
  return user;
}

async function createAccount(userId, provider, label) {
  return prisma.externalAccount.create({
    data: {
      userId,
      provider,
      username: `${label}-${suffix}`,
    },
  });
}

async function terminalizePreparation(runId, importRunId) {
  await prisma.importRun.update({
    where: { id: importRunId },
    data: { status: 'COMPLETED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: runId },
    data: { status: 'COMPLETED', completedAt: now, analysisCompletedAt: now },
  });
}

try {
  const service = createOnboardingCommandService({
    now: () => now,
    repository: createOnboardingCommandRepository(commandPrisma),
    admissionRepository: createOnboardingCommandAdmissionRepository(commandPrisma),
  });

  // Concurrent start is idempotent and accepts only one immutable first-run scope.
  const lifecycleUser = await createUser('Lifecycle command test');
  const lifecycleAccount = await createAccount(lifecycleUser.id, 'lichess', 'lifecycle');
  const [firstStart, secondStart] = await Promise.all([
    service.start(lifecycleUser.id, lifecycleAccount.id),
    service.start(lifecycleUser.id, lifecycleAccount.id),
  ]);
  assert.equal(firstStart.runId, secondStart.runId);
  assert.equal(firstStart.purpose, 'ONBOARDING');
  assert.equal(secondStart.purpose, 'ONBOARDING');
  assert.equal([firstStart.idempotent, secondStart.idempotent].filter(Boolean).length, 1);

  const initialRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: firstStart.runId },
    include: { targets: true },
  });
  assert.equal(initialRun.recipeVersion, 1);
  assert.equal(initialRun.purpose, 'ONBOARDING');
  assert.equal(initialRun.targets.length, 1);
  assert.equal(initialRun.targets[0].accountId, lifecycleAccount.id);
  assert.equal(initialRun.targets[0].requestedFrom.toISOString(), '2026-05-31T00:00:00.000Z');
  assert.equal(initialRun.targets[0].requestedTo.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.deepEqual(initialRun.recipeJson.scope, {
    variant: 'STANDARD',
    speeds: ['BLITZ', 'RAPID'],
    rated: 'BOTH',
  });
  assert.equal(initialRun.recipeJson.analysis.blocksCoreReadiness, false);
  assert.equal(initialRun.recipeJson.generation.course, false);
  assert.equal(initialRun.recipeJson.generation.repertoire, false);

  const initialImports = await prisma.importRun.findMany({
    where: { userId: lifecycleUser.id, accountId: lifecycleAccount.id },
  });
  assert.equal(initialImports.length, 1);
  const initialImport = initialImports[0];
  assert.equal(initialImport.source, 'ONBOARDING');
  assert.equal(initialImport.mode, 'BOUNDED_INITIAL');
  assert.equal(initialImport.requestedFrom?.toISOString(), '2026-05-31T00:00:00.000Z');
  assert.equal(initialImport.requestedTo?.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.deepEqual(initialImport.scopeJson, {
    variant: 'STANDARD',
    speeds: ['BLITZ', 'RAPID'],
    rated: 'BOTH',
  });

  // Skip changes guidance only; accepted preparation/import work remains live.
  const skipped = await service.skip(lifecycleUser.id);
  assert.equal(skipped.disposition, 'SKIPPED');
  assert.equal(skipped.reason, 'USER_SKIPPED');
  const skippedAgain = await service.skip(lifecycleUser.id);
  assert.equal(skippedAgain.idempotent, true);
  assert.equal((await prisma.dataPreparationRun.findUniqueOrThrow({ where: { id: initialRun.id } })).status, 'QUEUED');
  assert.equal((await prisma.importRun.findUniqueOrThrow({ where: { id: initialImport.id } })).status, 'QUEUED');

  // Control commands persist request/acknowledgement state and remain idempotent.
  const pauseRequested = await service.pause(lifecycleUser.id, initialRun.id);
  assert.equal(pauseRequested.status, 'PAUSE_REQUESTED');
  assert.equal((await service.pause(lifecycleUser.id, initialRun.id)).idempotent, true);
  await prisma.dataPreparationRun.update({
    where: { id: initialRun.id },
    data: { status: 'PAUSED', reconcileAfter: null },
  });
  const resumed = await service.resume(lifecycleUser.id, initialRun.id);
  assert.equal(resumed.status, 'RUNNING');
  const cancelRequested = await service.cancel(lifecycleUser.id, initialRun.id);
  assert.equal(cancelRequested.status, 'CANCEL_REQUESTED');
  assert.equal((await service.cancel(lifecycleUser.id, initialRun.id)).idempotent, true);

  const otherUser = await createUser('Lifecycle ownership test');
  await assert.rejects(
    () => service.pause(otherUser.id, initialRun.id),
    (error) => error instanceof OnboardingCommandNotFoundError,
  );

  // Terminal cancellation restarts as a new linked recovery run and import retry.
  await prisma.importRun.update({
    where: { id: initialImport.id },
    data: { status: 'CANCELLED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: initialRun.id },
    data: { status: 'CANCELLED', completedAt: now, reconcileAfter: null },
  });
  const recovery = await service.restart(lifecycleUser.id, initialRun.id);
  assert.equal(recovery.purpose, 'RECOVERY');
  assert.notEqual(recovery.runId, initialRun.id);
  const recoveryRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: recovery.runId },
    include: { targets: true },
  });
  assert.equal(recoveryRun.retryOfRunId, initialRun.id);
  assert.equal(recoveryRun.targets.length, 1);
  const recoveryImport = await prisma.importRun.findUniqueOrThrow({
    where: { id: recoveryRun.targets[0].currentImportRunId },
  });
  assert.equal(recoveryImport.retryOfImportRunId, initialImport.id);
  assert.equal(recoveryImport.mode, initialImport.mode);
  assert.deepEqual(recoveryImport.scopeJson, initialImport.scopeJson);
  const recoveryAgain = await service.restart(lifecycleUser.id, initialRun.id);
  assert.equal(recoveryAgain.runId, recovery.runId);
  assert.equal(recoveryAgain.idempotent, true);

  // Core readiness completes skipped first-run guidance durably through the existing DB invariant.
  await prisma.dataPreparationRun.update({
    where: { id: recovery.runId },
    data: { coreReadyAt: now },
  });
  const completedLifecycleUser = await prisma.appUser.findUniqueOrThrow({ where: { id: lifecycleUser.id } });
  assert.equal(completedLifecycleUser.onboardingDisposition, 'COMPLETED');
  assert.equal(completedLifecycleUser.onboardingDispositionReason, 'CORE_READY');

  // Explicit no-data finish is distinct from skip and is idempotent.
  const finishUser = await createUser('Lifecycle finish test');
  const finishAccount = await createAccount(finishUser.id, 'chess.com', 'finish');
  const finishStart = await service.start(finishUser.id, finishAccount.id);
  const finishRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: finishStart.runId },
    include: { targets: true },
  });
  await prisma.importRun.update({
    where: { id: finishRun.targets[0].currentImportRunId },
    data: { status: 'COMPLETED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: finishRun.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No eligible recent games.',
    },
  });
  const finished = await service.finish(finishUser.id, finishRun.id);
  assert.equal(finished.disposition, 'COMPLETED');
  assert.equal(finished.reason, 'USER_FINISHED_NO_RECENT_GAMES');
  assert.equal((await service.finish(finishUser.id, finishRun.id)).idempotent, true);

  // No-recent-games expansion retires that immutable attempt, then creates new immutable scopes.
  const expansionUser = await createUser('Lifecycle expansion test');
  const expansionAccount = await createAccount(expansionUser.id, 'lichess', 'expansion');
  const expansionStart = await service.start(expansionUser.id, expansionAccount.id);
  const sourceRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: expansionStart.runId },
    include: { targets: true },
  });
  const sourceImportId = sourceRun.targets[0].currentImportRunId;
  await prisma.importRun.update({
    where: { id: sourceImportId },
    data: { status: 'COMPLETED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: sourceRun.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No eligible recent games.',
    },
  });

  const olderHistory = await service.expand(expansionUser.id, sourceRun.id, {
    kind: 'OLDER_HISTORY',
    accountId: expansionAccount.id,
  });
  assert.equal(olderHistory.purpose, 'EXPANSION');
  assert.equal((await prisma.dataPreparationRun.findUniqueOrThrow({ where: { id: sourceRun.id } })).status, 'COMPLETED');
  const olderRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: olderHistory.runId },
    include: { targets: true },
  });
  assert.equal(olderRun.recipeJson.sourceRunId, sourceRun.id);
  assert.equal(olderRun.recipeJson.expansionKind, 'OLDER_HISTORY');
  assert.equal(olderRun.targets[0].requestedFrom.toISOString(), '2026-02-28T00:00:00.000Z');
  assert.equal(olderRun.targets[0].requestedTo.toISOString(), '2026-05-31T00:00:00.000Z');
  const olderImport = await prisma.importRun.findUniqueOrThrow({
    where: { id: olderRun.targets[0].currentImportRunId },
  });
  assert.equal(olderImport.mode, 'HISTORICAL_BACKFILL');
  const duplicateOlder = await service.expand(expansionUser.id, sourceRun.id, {
    kind: 'OLDER_HISTORY',
    accountId: expansionAccount.id,
  });
  assert.equal(duplicateOlder.runId, olderRun.id);
  assert.equal(duplicateOlder.idempotent, true);
  await terminalizePreparation(olderRun.id, olderImport.id);

  const bullet = await service.expand(expansionUser.id, sourceRun.id, {
    kind: 'INCLUDE_BULLET',
    accountId: expansionAccount.id,
  });
  const bulletRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: bullet.runId },
    include: { targets: true },
  });
  const bulletImport = await prisma.importRun.findUniqueOrThrow({
    where: { id: bulletRun.targets[0].currentImportRunId },
  });
  assert.equal(bulletImport.mode, 'BOUNDED_INITIAL');
  assert.deepEqual(bulletImport.scopeJson.speeds, ['BULLET']);
  assert.equal(bulletRun.targets[0].requestedFrom.toISOString(), '2026-05-31T00:00:00.000Z');
  assert.equal(bulletRun.targets[0].requestedTo.toISOString(), '2026-09-01T00:00:00.000Z');
  await terminalizePreparation(bulletRun.id, bulletImport.id);

  const addedAccount = await createAccount(expansionUser.id, 'chess.com', 'added');
  const accountExpansion = await service.expand(expansionUser.id, sourceRun.id, {
    kind: 'ADD_ACCOUNT',
    accountId: addedAccount.id,
  });
  const accountExpansionRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: accountExpansion.runId },
    include: { targets: true },
  });
  assert.equal(accountExpansionRun.targets[0].accountId, addedAccount.id);
  assert.equal(accountExpansionRun.targets[0].requestedFrom.toISOString(), '2026-05-31T00:00:00.000Z');
  assert.equal(accountExpansionRun.targets[0].requestedTo.toISOString(), '2026-09-01T00:00:00.000Z');

  // Retry is delegated to the reconciler and returns the newly persisted generation.
  const retryRun = {
    id: 901,
    userId: 902,
    purpose: 'ONBOARDING',
    status: 'NEEDS_ATTENTION',
    recipeVersion: 1,
    recipe: {},
    retryOfRunId: null,
    retryGeneration: 0,
    attentionCode: 'ALL_INDEXING_FAILED',
    coreReadyAt: null,
    createdAt: now,
    targets: [],
  };
  let retryGeneration = 0;
  const retryService = createOnboardingCommandService({
    repository: {
      async getRun() {
        return { ...retryRun, retryGeneration };
      },
      async getActiveRun() { return null; },
      async getDisposition() { return { disposition: 'PENDING', reason: null, changedAt: null }; },
      async skip() { throw new Error('not used'); },
      async finishNoRecentGames() { throw new Error('not used'); },
      async completeNoRecentRunForExpansion() { throw new Error('not used'); },
    },
    reconciler: {
      async retry() {
        retryGeneration += 1;
        return retryGeneration;
      },
      async requestPause() { throw new Error('not used'); },
      async resume() { throw new Error('not used'); },
      async requestCancel() { throw new Error('not used'); },
      async runUntilStopped() { throw new Error('not used'); },
      requestStop() {},
      wake() {},
      async reconcileOnce() { throw new Error('not used'); },
    },
    now: () => now,
  });
  const retried = await retryService.retry(retryRun.userId, retryRun.id);
  assert.equal(retried.retryGeneration, 1);
  assert.equal(retried.idempotent, false);

  console.log('Onboarding lifecycle command tests passed.');
} finally {
  for (const user of users.reverse()) {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
  }
  await commandPrisma.$disconnect();
  await prisma.$disconnect();
}
