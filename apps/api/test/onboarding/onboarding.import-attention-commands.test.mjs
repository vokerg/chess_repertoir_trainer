import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
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
const lockMonitor = new PrismaClient();
let stopLockMonitor = () => {};

async function reportOpenTransactions(label) {
  const rows = await lockMonitor.$queryRawUnsafe(`
    SELECT
      pid,
      state,
      wait_event_type,
      wait_event,
      EXTRACT(EPOCH FROM (clock_timestamp() - xact_start)) AS xact_age_seconds,
      EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) AS query_age_seconds,
      pg_blocking_pids(pid)::text AS blocking_pids,
      query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND xact_start IS NOT NULL
    ORDER BY pid
  `);
  console.error(`[onboarding-boundary ${label}] ${JSON.stringify(rows.map((row) => ({
    pid: row.pid,
    state: row.state,
    waitEvent: row.wait_event_type ? `${row.wait_event_type}:${row.wait_event}` : null,
    xactAgeSeconds: row.xact_age_seconds,
    queryAgeSeconds: row.query_age_seconds,
    blockingPids: row.blocking_pids,
    query: String(row.query ?? '').replace(/\s+/g, ' ').slice(0, 240),
  })))}`);
}

function startLockMonitor() {
  if (process.env['CODEX_DISABLE_ONBOARDING_LOCK_MONITOR'] === '1') return () => {};
  process.env['CODEX_TRACE_LIFECYCLE_TRANSACTIONS'] = '1';
  let running = false;
  const sample = async () => {
    if (running) return;
    running = true;
    try {
      const rows = await lockMonitor.$queryRawUnsafe(`
        SELECT
          pid,
          application_name,
          state,
          wait_event_type,
          wait_event,
          lock_namespace,
          lock_key,
          lock_granted,
          EXTRACT(EPOCH FROM (clock_timestamp() - xact_start)) AS xact_age_seconds,
          EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) AS query_age_seconds,
          pg_blocking_pids(pid)::text AS blocking_pids,
          query
        FROM pg_stat_activity
        LEFT JOIN LATERAL (
          SELECT
            l.classid AS lock_namespace,
            l.objid AS lock_key,
            l.granted AS lock_granted
          FROM pg_locks AS l
          WHERE l.pid = pg_stat_activity.pid
            AND l.locktype = 'advisory'
          ORDER BY l.granted DESC
          LIMIT 1
        ) AS advisory_lock ON TRUE
        WHERE datname = current_database()
          AND pg_stat_activity.pid <> pg_backend_pid()
          AND (state <> 'idle' OR xact_start IS NOT NULL)
        ORDER BY pid
      `);
      const interesting = rows.filter((row) => (
        row.wait_event_type !== null
        || Number(row.xact_age_seconds ?? 0) > 1
        || Number(row.query_age_seconds ?? 0) > 1
      ));
      if (interesting.length > 0) {
        console.error(`[onboarding-lock-monitor ${new Date().toISOString()}] ${JSON.stringify(
          interesting.map((row) => ({
            pid: row.pid,
            applicationName: row.application_name,
            state: row.state,
            waitEvent: row.wait_event_type ? `${row.wait_event_type}:${row.wait_event}` : null,
            lock: row.lock_namespace === null ? null : {
              namespace: Number(row.lock_namespace),
              key: Number(row.lock_key),
              granted: row.lock_granted,
            },
            xactAgeSeconds: row.xact_age_seconds,
            queryAgeSeconds: row.query_age_seconds,
            blockingPids: row.blocking_pids,
            query: String(row.query ?? '').replace(/\s+/g, ' ').slice(0, 400),
          })),
        )}`);
      }
    } catch (error) {
      console.error(`[onboarding-lock-monitor-error] ${error.message}`);
    } finally {
      running = false;
    }
  };

  const interval = setInterval(() => { void sample(); }, 250);
  void sample();
  return () => clearInterval(interval);
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
  await reportOpenTransactions('after-user');
  const pausedAccount = await createAccount(pausedUser.id, 'lichess', 'paused-import');
  await reportOpenTransactions('after-account');
  stopLockMonitor = startLockMonitor();
  await reportOpenTransactions('before-start');
  const pausedStart = await service.start(pausedUser.id, pausedAccount.id);
  stopLockMonitor();
  stopLockMonitor = () => {};
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
  stopLockMonitor();
  for (const user of users.reverse()) {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
  }
  await lockMonitor.$disconnect();
  await prisma.$disconnect();
}
