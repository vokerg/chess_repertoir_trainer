import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createOnboardingCommandService,
  OnboardingCommandInvalidStateError,
  OnboardingCommandNotFoundError,
} from '../../dist/modules/onboarding/onboarding-command.service.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const now = new Date('2026-08-31T12:00:00.000Z');
const users = [];

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

async function loadRun(runId) {
  return prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: runId },
    include: { targets: true },
  });
}

try {
  const service = createOnboardingCommandService({ now: () => now });

  // IMPORT_PAUSED is an executable readiness action: resume the linked import,
  // keep the same preparation, and make an immediate replay idempotent while
  // reconciliation has not yet cleared the attention state.
  const pausedUser = await createUser('Onboarding paused import resume');
  const pausedAccount = await createAccount(pausedUser.id, 'lichess', 'paused-import');
  const pausedStart = await service.start(pausedUser.id, pausedAccount.id);
  const pausedRun = await loadRun(pausedStart.runId);
  const pausedImportId = pausedRun.targets[0].currentImportRunId;
  assert.ok(pausedImportId);
  await prisma.importRun.update({
    where: { id: pausedImportId },
    data: {
      status: 'PAUSED',
      pauseRequestedAt: now,
    },
  });
  await prisma.dataPreparationRun.update({
    where: { id: pausedRun.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'IMPORT_PAUSED',
      attentionDetail: 'Linked import is paused.',
      reconcileAfter: null,
    },
  });

  const resumed = await service.resume(pausedUser.id, pausedRun.id);
  assert.equal(resumed.runId, pausedRun.id);
  assert.equal(resumed.idempotent, false);
  const resumedImport = await prisma.importRun.findUniqueOrThrow({ where: { id: pausedImportId } });
  assert.equal(resumedImport.status, 'QUEUED');
  assert.equal(resumedImport.pauseRequestedAt, null);
  assert.equal(await prisma.dataPreparationRun.count({ where: { userId: pausedUser.id } }), 1);

  const replayedResume = await service.resume(pausedUser.id, pausedRun.id);
  assert.equal(replayedResume.runId, pausedRun.id);
  assert.equal(replayedResume.idempotent, true);

  // IMPORT_RETRY_AVAILABLE creates immutable retry lineage and atomically
  // relinks the existing target instead of creating a second preparation run.
  const retryUser = await createUser('Onboarding failed import retry');
  const retryAccount = await createAccount(retryUser.id, 'chess.com', 'failed-import');
  const retryStart = await service.start(retryUser.id, retryAccount.id);
  const retryRun = await loadRun(retryStart.runId);
  const failedImportId = retryRun.targets[0].currentImportRunId;
  assert.ok(failedImportId);
  const failedImport = await prisma.importRun.findUniqueOrThrow({ where: { id: failedImportId } });
  await prisma.importRun.update({
    where: { id: failedImportId },
    data: {
      status: 'FAILED',
      completedAt: now,
      errorCode: 'TEST_IMPORT_FAILED',
      error: 'test failure',
    },
  });
  await prisma.dataPreparationRun.update({
    where: { id: retryRun.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'IMPORT_RETRY_AVAILABLE',
      attentionDetail: 'Linked import failed.',
      reconcileAfter: null,
    },
  });

  const retried = await service.retry(retryUser.id, retryRun.id);
  assert.equal(retried.runId, retryRun.id);
  assert.equal(retried.idempotent, false);
  const afterRetry = await loadRun(retryRun.id);
  const retryImportId = afterRetry.targets[0].currentImportRunId;
  assert.ok(retryImportId);
  assert.notEqual(retryImportId, failedImportId);
  const retryImport = await prisma.importRun.findUniqueOrThrow({ where: { id: retryImportId } });
  assert.equal(retryImport.retryOfImportRunId, failedImportId);
  assert.equal(retryImport.status, 'QUEUED');
  assert.equal(retryImport.mode, failedImport.mode);
  assert.equal(retryImport.source, failedImport.source);
  assert.equal(retryImport.scopeHash, failedImport.scopeHash);
  assert.equal(retryImport.requestedFrom?.getTime(), failedImport.requestedFrom?.getTime());
  assert.equal(retryImport.requestedTo?.getTime(), failedImport.requestedTo?.getTime());
  assert.equal(await prisma.dataPreparationRun.count({ where: { userId: retryUser.id } }), 1);
  assert.equal(await prisma.importRun.count({ where: { userId: retryUser.id } }), 2);

  const replayedRetry = await service.retry(retryUser.id, retryRun.id);
  assert.equal(replayedRetry.runId, retryRun.id);
  assert.equal(replayedRetry.idempotent, true);
  assert.equal(await prisma.importRun.count({ where: { userId: retryUser.id } }), 2);
  assert.equal((await loadRun(retryRun.id)).targets[0].currentImportRunId, retryImportId);

  // Finish remains ownership-scoped even after disposition has already completed.
  const finishUser = await createUser('Onboarding finish ownership');
  const finishAccount = await createAccount(finishUser.id, 'lichess', 'finish-owned');
  const finishStart = await service.start(finishUser.id, finishAccount.id);
  await prisma.dataPreparationRun.update({
    where: { id: finishStart.runId },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No recent games.',
      reconcileAfter: null,
    },
  });
  const finished = await service.finish(finishUser.id, finishStart.runId);
  assert.equal(finished.disposition, 'COMPLETED');

  const foreignUser = await createUser('Onboarding finish foreign owner');
  const foreignAccount = await createAccount(foreignUser.id, 'chess.com', 'finish-foreign');
  const foreignStart = await service.start(foreignUser.id, foreignAccount.id);
  await assert.rejects(
    () => service.finish(finishUser.id, foreignStart.runId),
    (error) => error instanceof OnboardingCommandNotFoundError,
  );
  await assert.rejects(
    () => service.finish(finishUser.id, 2_000_000_000),
    (error) => error instanceof OnboardingCommandNotFoundError,
  );

  // SKIPPED is terminal for explicit finish and cannot be overwritten.
  const skippedUser = await createUser('Onboarding skipped finish gate');
  const skippedAccount = await createAccount(skippedUser.id, 'lichess', 'skipped-finish');
  const skippedStart = await service.start(skippedUser.id, skippedAccount.id);
  await prisma.dataPreparationRun.update({
    where: { id: skippedStart.runId },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No recent games.',
      reconcileAfter: null,
    },
  });
  const skipped = await service.skip(skippedUser.id);
  assert.equal(skipped.disposition, 'SKIPPED');
  await assert.rejects(
    () => service.finish(skippedUser.id, skippedStart.runId),
    (error) => error instanceof OnboardingCommandInvalidStateError,
  );
  assert.equal(
    (await prisma.appUser.findUniqueOrThrow({ where: { id: skippedUser.id } })).onboardingDisposition,
    'SKIPPED',
  );

  // Historical targets survive account deletion as detached snapshots. Commands
  // return a defined lifecycle conflict rather than failing hydration with a 500.
  const deletedUser = await createUser('Onboarding deleted historical account');
  const deletedAccount = await createAccount(deletedUser.id, 'chess.com', 'deleted-source');
  const deletedStart = await service.start(deletedUser.id, deletedAccount.id);
  const deletedRun = await loadRun(deletedStart.runId);
  const deletedImportId = deletedRun.targets[0].currentImportRunId;
  assert.ok(deletedImportId);
  await prisma.importRun.update({
    where: { id: deletedImportId },
    data: { status: 'CANCELLED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: deletedRun.id },
    data: { status: 'CANCELLED', completedAt: now, reconcileAfter: null },
  });
  await prisma.externalAccount.delete({ where: { id: deletedAccount.id } });
  const detachedTarget = await prisma.dataPreparationTarget.findFirstOrThrow({
    where: { preparationRunId: deletedRun.id },
  });
  assert.equal(detachedTarget.accountId, null);
  await assert.rejects(
    () => service.restart(deletedUser.id, deletedRun.id),
    (error) => error instanceof OnboardingCommandInvalidStateError,
  );

  console.log('Onboarding import-attention command tests passed.');
} finally {
  for (const user of users.reverse()) {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}