import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createRunningGameAnalysisRun,
  failGameAnalysisRun,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';
import {
  abandonGameAnalysisRun,
  findAbortCleanupCandidate,
  getImportedGameAnalysisExecutionState,
} from '../../dist/modules/analysis/analysis-run-lifecycle.repository.prisma.js';
import {
  createImportedGameAnalysisExecutionService,
} from '../../dist/modules/analysis/imported-game-analysis-execution.service.js';
import { JobRunRepository } from '../../dist/modules/jobs/job-run.repository.prisma.js';
import { JobTaskExecutorRegistry } from '../../dist/modules/jobs/job-task-executor.js';
import { createJobWorkerRepository } from '../../dist/modules/jobs/job-worker.repository.prisma.js';
import { createJobWorker } from '../../dist/modules/jobs/job-worker.service.js';

const workerConfig = {
  pollIntervalMs: 25,
  heartbeatIntervalMs: 10,
  staleAfterMs: 1_000,
  staleRecoveryIntervalMs: 1_000,
  terminalRetentionDays: 30,
  sliceSize: 25,
  shutdownTimeoutMs: 1_000,
};
const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

{
  let claimed = false;
  let heartbeatCalls = 0;
  let finishCalls = 0;
  let failCalls = 0;
  let releaseCalls = 0;
  let executorAborted = false;
  let worker;

  const task = {
    id: 1,
    jobRunId: 10,
    userId: 100,
    kind: 'INDEX_GAMES',
    priority: 400,
    force: false,
    importedGameId: 1_000,
    ordinal: 0,
    workKey: 'GAME_WORK:cancellation-test',
  };

  const repository = {
    async recoverStaleTasks() { return 0; },
    async skipOrphanedTasks() { return 0; },
    async claimNextTask() {
      if (claimed) return null;
      claimed = true;
      return task;
    },
    async hasHigherPriorityRunnableWork() { return false; },
    async heartbeatTask() {
      heartbeatCalls += 1;
      return false;
    },
    async finishTask() {
      finishCalls += 1;
      return true;
    },
    async failTask() {
      failCalls += 1;
      return true;
    },
    async releaseTask() {
      releaseCalls += 1;
      return true;
    },
    async touchJobRun() {},
  };

  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute(_task, context) {
      await new Promise((resolve, reject) => {
        const safetyTimer = setTimeout(() => {
          reject(new Error('Timed out waiting for cancellation-driven claim loss.'));
        }, 1_000);
        context.signal.addEventListener('abort', () => {
          clearTimeout(safetyTimer);
          executorAborted = true;
          worker.requestStop('Cancellation claim-loss test completed.');
          reject(context.signal.reason);
        }, { once: true });
      });
      return 'COMPLETED';
    },
  }]);

  worker = createJobWorker({ repository, executors, config: workerConfig, logger: silentLogger });
  await worker.run();

  assert.equal(executorAborted, true);
  assert.ok(heartbeatCalls >= 1);
  assert.equal(finishCalls, 0);
  assert.equal(failCalls, 0);
  assert.equal(releaseCalls, 0);
}

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Cancellation integration test',
      authProvider: 'test',
      authSubject: `job-cancellation-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `job-cancellation-${suffix}`,
    },
  });

  const createGame = (name) => prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `${name}-${suffix}`,
      endedAt: new Date('2026-07-18T05:00:00.000Z'),
    },
  });

  {
    const game = await createGame('settlement-race');
    const jobRun = await prisma.jobRun.create({
      data: {
        userId,
        kind: 'INDEX_GAMES',
        source: 'USER_ACTION',
        priority: 400,
        status: 'RUNNING',
        totalTasks: 1,
        startedAt: new Date(),
        tasks: {
          create: {
            importedGameId: game.id,
            ordinal: 0,
            status: 'RUNNING',
            workKey: `GAME_WORK:settlement-race-${suffix}`,
          },
        },
      },
      include: { tasks: true },
    });
    const task = jobRun.tasks[0];
    let taskRowLocked;
    const taskRowLockedPromise = new Promise((resolve) => { taskRowLocked = resolve; });

    const settlement = prisma.$transaction(async (transaction) => {
      await transaction.jobTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETED', workKey: null, error: null },
      });
      taskRowLocked();
      await transaction.$queryRaw`SELECT 1::int AS "slept" FROM pg_sleep(0.15)`;
      await transaction.$queryRaw`
        SELECT "id"
        FROM "JobRun"
        WHERE "id" = ${jobRun.id}
        FOR UPDATE
      `;
      await transaction.jobRun.update({
        where: { id: jobRun.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    await taskRowLockedPromise;
    const cancellation = JobRunRepository.cancelForUser(userId, jobRun.id);
    const [, cancelledResult] = await Promise.all([settlement, cancellation]);

    assert.equal(cancelledResult?.status, 'COMPLETED');
    assert.equal(
      (await prisma.jobTask.findUniqueOrThrow({ where: { id: task.id } })).status,
      'COMPLETED',
      'settlement that owns the task row wins without a deadlock',
    );
  }

  {
    const game = await createGame('analysis-cancellation');
    const jobRun = await prisma.jobRun.create({
      data: {
        userId,
        kind: 'ANALYSE_GAMES',
        source: 'USER_ACTION',
        priority: 300,
        status: 'QUEUED',
        totalTasks: 1,
        tasks: {
          create: {
            importedGameId: game.id,
            ordinal: 0,
            status: 'QUEUED',
          },
        },
      },
      include: { tasks: true },
    });

    const executionService = createImportedGameAnalysisExecutionService({
      analyseOne: async (_engine, _runUserId, importedGameId, options) => {
        const run = await createRunningGameAnalysisRun({
          importedGameId,
          positionsTotal: 1,
          positionsDone: 0,
        });
        try {
          await waitForAbort(options.signal);
          return 'COMPLETED';
        } catch (error) {
          await failGameAnalysisRun(run.id, errorMessage(error));
          throw error;
        }
      },
      refreshTags: async () => {},
      getExecutionState: getImportedGameAnalysisExecutionState,
      findAbortCleanupCandidate,
      abandonRun: abandonGameAnalysisRun,
    });

    let worker;
    const executors = new JobTaskExecutorRegistry([{
      kind: 'ANALYSE_GAMES',
      async execute(task, context) {
        try {
          return await executionService.analyseOne(
            {},
            task.userId,
            task.importedGameId,
            {
              depth: 12,
              multipv: 1,
              force: false,
              refreshTagsAfterAnalysis: true,
              signal: context.signal,
            },
          );
        } finally {
          worker.requestStop('Analysis cancellation integration test completed.');
        }
      },
    }]);
    worker = createJobWorker({
      repository: createJobWorkerRepository(prisma),
      executors,
      config: workerConfig,
      logger: silentLogger,
    });

    const workerRun = worker.run();
    await waitUntil(async () => (
      await prisma.jobTask.findUnique({ where: { id: jobRun.tasks[0].id } })
    )?.status === 'RUNNING');
    await waitUntil(async () => (
      await prisma.gameAnalysisRun.count({
        where: { importedGameId: game.id, status: 'RUNNING' },
      })
    ) === 1);

    const cancelled = await JobRunRepository.cancelForUser(userId, jobRun.id);
    assert.equal(cancelled?.status, 'CANCELLED');
    await workerRun;

    const storedTask = await prisma.jobTask.findUniqueOrThrow({
      where: { id: jobRun.tasks[0].id },
    });
    assert.equal(storedTask.status, 'CANCELLED');
    assert.equal(
      await prisma.gameAnalysisRun.count({ where: { importedGameId: game.id } }),
      0,
      'claim-loss cancellation abandons the transient failed analysis attempt',
    );
    const storedGame = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(storedGame.latestAnalysisRunId, null);
    assert.equal(storedGame.latestAnalysisStatus, null);
  }

  console.log('Persistent job cancellation and analysis lifecycle tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}

function waitForAbort(signal) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const safetyTimer = setTimeout(() => {
      reject(new Error('Timed out waiting for analysis cancellation.'));
    }, 2_000);
    signal?.addEventListener('abort', () => {
      clearTimeout(safetyTimer);
      reject(signal.reason);
    }, { once: true });
  });
}

async function waitUntil(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for persistent job test state.');
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
