import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupRepository } from '../../dist/modules/position-cleanup/position-cleanup.repository.prisma.js';
import {
  createPositionCleanupService,
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
} from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const workerClient = new PrismaClient();
const controlClient = new PrismaClient();
const workerRepository = createPositionCleanupRepository(workerClient);
const controlRepository = createPositionCleanupRepository(controlClient);
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '1',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '1',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, repository: controlRepository });

let markExecuteStarted;
const executeStarted = new Promise((resolve) => { markExecuteStarted = resolve; });
let releaseFailure;
const failureRelease = new Promise((resolve) => { releaseFailure = resolve; });

const repository = {
  ...workerRepository,
  async executeDeleteBatch() {
    markExecuteStarted();
    await failureRelease;
    throw new Error('FORCED_GENERIC_FAILURE');
  },
};

const worker = createPositionCleanupWorker({
  config,
  repository,
  logger: { info() {}, warn() {}, error() {} },
});

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const run = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:failure-cancellation-race',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });

  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "phase" = 'EVALUATE',
        "reconcileUpperBound" = 0,
        "positionUpperBound" = 0,
        "evaluationUpperBound" = 0
    WHERE "id" = ${run.id}
  `;

  const workPromise = worker.runOnce();
  await executeStarted;

  const cancellation = await service.cancel(run.id);
  assert.ok(cancellation.cancelRequestedAt instanceof Date);

  releaseFailure();
  assert.equal(await workPromise, true);

  const cancelled = await service.status(run.id);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.phase, 'DONE');
  assert.equal(cancelled.terminalResult, 'CANCELLED');
  assert.equal(cancelled.errorCode, null);
  assert.equal(cancelled.retryCount, 0);
  assert.equal(cancelled.workKey, null);

  console.log('Position cleanup generic failure cancellation race tests passed.');
} finally {
  releaseFailure?.();
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  await worker.close();
  await workerClient.$disconnect();
  await controlClient.$disconnect();
}
