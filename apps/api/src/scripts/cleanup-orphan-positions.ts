import 'dotenv/config';
import prisma from '../prisma';
import { loadPositionCleanupConfig } from '../modules/position-cleanup/position-cleanup.config';
import {
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  createPositionCleanupService,
} from '../modules/position-cleanup/position-cleanup.service';
import { isPositionCleanupTerminal } from '../modules/position-cleanup/position-cleanup.types';
import { createPositionCleanupWorker } from '../modules/position-cleanup/position-cleanup.worker.service';

const apply = process.argv.includes('--apply');
const confirmation = process.argv
  .find((argument) => argument.startsWith('--confirm='))
  ?.slice('--confirm='.length);

async function main(): Promise<void> {
  const config = loadPositionCleanupConfig();
  const service = createPositionCleanupService({ config });
  const worker = createPositionCleanupWorker({ config });
  const mode = apply ? 'EXECUTE' : 'DRY_RUN';

  if (apply && confirmation !== POSITION_CLEANUP_EXECUTE_CONFIRMATION) {
    throw new Error(
      `Execution requires --apply --confirm=${POSITION_CLEANUP_EXECUTE_CONFIRMATION}.`,
    );
  }

  const preview = await service.preview(mode);
  console.log(JSON.stringify({
    mode: preview.mode,
    policyVersion: preview.policyVersion,
    graceDays: preview.graceDays,
    graceCutoff: preview.graceCutoff,
    inputPageSize: preview.inputPageSize,
    deleteBatchSize: preview.deleteBatchSize,
    lockTimeoutMs: preview.lockTimeoutMs,
    observational: preview.observational,
    postgresServerVersionNum: preview.postgresServerVersionNum,
  }));

  if (!apply) {
    console.log(
      `Dry-run is observational across bounded transactions. Re-run with --apply --confirm=${POSITION_CLEANUP_EXECUTE_CONFIRMATION} only after reviewing the result.`,
    );
  }

  const run = await service.create({
    mode,
    requestedBy: 'server-command:position-cleanup',
    confirmation,
  });
  console.log(JSON.stringify({ runId: run.id, status: run.status, phase: run.phase }));

  for (;;) {
    const current = await service.status(run.id);
    if (isPositionCleanupTerminal(current.status)) {
      console.log(JSON.stringify({
        runId: current.id,
        mode: current.mode,
        status: current.status,
        phase: current.phase,
        terminalResult: current.terminalResult,
        errorCode: current.errorCode,
        inputPageSize: current.inputPageSize,
        initialDeleteBatchSize: current.initialDeleteBatchSize,
        deleteBatchSize: current.deleteBatchSize,
        candidatesInspected: current.candidatesInspected,
        candidatesReconciled: current.candidatesReconciled,
        positionsInspected: current.positionsInspected,
        orphansFirstObserved: current.orphansFirstObserved,
        orphansRefreshed: current.orphansRefreshed,
        eligibleObserved: current.eligibleObserved,
        positionsDeleted: current.positionsDeleted,
        analysisRowsDeleted: current.analysisRowsDeleted,
        cacheRowsDeleted: current.cacheRowsDeleted,
        skippedReferenced: current.skippedReferenced,
        retryCount: current.retryCount,
        lockTimeoutStreak: current.lockTimeoutStreak,
        staleRecoveryCount: current.staleRecoveryCount,
        observationStartedAt: current.observationStartedAt,
        observationCompletedAt: current.observationCompletedAt,
        completedAt: current.completedAt,
      }));
      if (current.status !== 'COMPLETED') process.exitCode = 1;
      return;
    }

    const didWork = await worker.runOnce();
    if (!didWork) {
      // A separately running persistent worker may own the same durable run. Do not
      // turn a healthy exact-work-key claim into a false CLI failure; poll status and
      // opportunistically claim again after the normal cleanup poll interval.
      await wait(config.pollIntervalMs);
    }
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
