import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
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

// Temporary CI diagnosis for the intermittent cross-suite transaction stall.
// This is removed once the lock owner is identified.
async function monitorAdmissionLocks() {
  const monitor = new PrismaClient();
  let inFlight = null;
  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = (async () => {
      const blocked = await monitor.$queryRawUnsafe(`
        SELECT
          blocked.pid AS blocked_pid,
          blocked.state AS blocked_state,
          blocked.wait_event_type,
          blocked.wait_event,
          EXTRACT(EPOCH FROM (clock_timestamp() - blocked.xact_start)) AS blocked_xact_age_seconds,
          blocked.query AS blocked_query,
          blocker.pid AS blocking_pid,
          blocker.state AS blocking_state,
          EXTRACT(EPOCH FROM (clock_timestamp() - blocker.xact_start)) AS blocking_xact_age_seconds,
          blocker.query AS blocking_query,
          lock.classid,
          lock.objid,
          lock.mode,
          lock.granted
        FROM pg_stat_activity AS blocked
        CROSS JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blocker_pid(pid)
        JOIN pg_stat_activity AS blocker ON blocker.pid = blocker_pid.pid
        LEFT JOIN pg_locks AS lock
          ON lock.pid = blocked.pid
         AND lock.locktype = 'advisory'
        WHERE blocked.datname = current_database()
          AND blocked.pid <> pg_backend_pid()
      `);
      const advisoryLocks = await monitor.$queryRawUnsafe(`
        SELECT
          lock.pid,
          lock.classid,
          lock.objid,
          lock.mode,
          lock.granted,
          activity.state,
          activity.wait_event_type,
          activity.wait_event,
          EXTRACT(EPOCH FROM (clock_timestamp() - activity.xact_start)) AS xact_age_seconds,
          activity.query
        FROM pg_locks AS lock
        JOIN pg_stat_activity AS activity ON activity.pid = lock.pid
        WHERE activity.datname = current_database()
          AND lock.locktype = 'advisory'
          AND lock.pid <> pg_backend_pid()
        ORDER BY lock.granted, lock.pid
      `);
      if (blocked.length > 0 || advisoryLocks.some((lock) => !lock.granted)) {
        console.error('ONBOARDING_ADMISSION_LOCK_DIAGNOSTIC', JSON.stringify({ blocked, advisoryLocks }));
      }
    })().catch((error) => {
      console.error('ONBOARDING_ADMISSION_LOCK_DIAGNOSTIC_ERROR', error);
    }).finally(() => {
      inFlight = null;
    });
  }, 250);

  return async () => {
    clearInterval(timer);
    await inFlight;
    await monitor.$disconnect();
  };
}

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
  const stopAdmissionLockMonitor = await monitorAdmissionLocks();
  let pausedStart;
  try {
    pausedStart = await service.start(pausedUser.id, pausedAccount.id);
  } finally {
    await stopAdmissionLockMonitor();
  }
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
  assert.equal(retried.retryGeneration, 1);
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
  assert.equal(replayedRetry.retryGeneration, 1);
  assert.equal(replayedRetry.idempotent, true);
  assert.equal(await prisma.importRun.count({ where: { userId: retryUser.id } }), 2);
  assert.equal((await loadRun(retryRun.id)).targets[0].currentImportRunId, retryImportId);

  // The retry import may finish before the preparation reconciler consumes the
  // stale attention state. Durable retry lineage still makes a lost-response
  // replay idempotent instead of turning the already accepted command into 409.
  await prisma.importRun.update({
    where: { id: retryImportId },
    data: { status: 'COMPLETED', completedAt: now },
  });
  const replayedAfterImportCompletion = await createOnboardingCommandService({ now: () => now })
    .retry(retryUser.id, retryRun.id);
  assert.equal(replayedAfterImportCompletion.runId, retryRun.id);
  assert.equal(replayedAfterImportCompletion.retryGeneration, 1);
  assert.equal(replayedAfterImportCompletion.idempotent, true);
  assert.equal(await prisma.importRun.count({ where: { userId: retryUser.id } }), 2);

  // Reconciliation may consume the attention state before a client recovers
  // from a lost response. The retry generation remains a durable process-restart
  // replay marker after the parent has moved back to RUNNING.
  await prisma.dataPreparationRun.update({
    where: { id: retryRun.id },
    data: {
      status: 'RUNNING',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: now,
    },
  });
  const restartedService = createOnboardingCommandService({ now: () => now });
  const replayedAfterReconcile = await restartedService.retry(retryUser.id, retryRun.id);
  assert.equal(replayedAfterReconcile.runId, retryRun.id);
  assert.equal(replayedAfterReconcile.retryGeneration, 1);
  assert.equal(replayedAfterReconcile.idempotent, true);
  assert.equal(await prisma.importRun.count({ where: { userId: retryUser.id } }), 2);

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

  // Concurrent finish replays converge to one mutation while the loser reports
  // idempotent=true rather than claiming a second state transition.
  const concurrentFinishUser = await createUser('Onboarding concurrent finish');
  const concurrentFinishAccount = await createAccount(concurrentFinishUser.id, 'lichess', 'concurrent-finish');
  const concurrentFinishStart = await service.start(concurrentFinishUser.id, concurrentFinishAccount.id);
  await prisma.dataPreparationRun.update({
    where: { id: concurrentFinishStart.runId },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No recent games.',
      reconcileAfter: null,
    },
  });
  const concurrentFinish = await Promise.all([
    service.finish(concurrentFinishUser.id, concurrentFinishStart.runId),
    service.finish(concurrentFinishUser.id, concurrentFinishStart.runId),
  ]);
  assert.deepEqual(concurrentFinish.map((result) => result.idempotent).sort(), [false, true]);
  assert.ok(concurrentFinish.every((result) => result.disposition === 'COMPLETED'));

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

  // A skip/finish race has exactly one state-changing winner. The losing command
  // cannot overwrite the winner's durable disposition.
  const dispositionRaceUser = await createUser('Onboarding disposition race');
  const dispositionRaceAccount = await createAccount(dispositionRaceUser.id, 'chess.com', 'disposition-race');
  const dispositionRaceStart = await service.start(dispositionRaceUser.id, dispositionRaceAccount.id);
  await prisma.dataPreparationRun.update({
    where: { id: dispositionRaceStart.runId },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No recent games.',
      reconcileAfter: null,
    },
  });
  const dispositionRace = await Promise.allSettled([
    service.skip(dispositionRaceUser.id),
    service.finish(dispositionRaceUser.id, dispositionRaceStart.runId),
  ]);
  assert.equal(dispositionRace.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(dispositionRace.filter((result) => result.status === 'rejected').length, 1);
  const persistedDisposition = (
    await prisma.appUser.findUniqueOrThrow({ where: { id: dispositionRaceUser.id } })
  ).onboardingDisposition;
  assert.ok(persistedDisposition === 'SKIPPED' || persistedDisposition === 'COMPLETED');

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
