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
        candidatesInspected: current.candidatesInspected,
        candidatesReconciled: current.candidatesReconciled,
        positionsInspected: current.positionsInspected,
        orphansObserved: current.orphansObserved,
        eligibleObserved: current.eligibleObserved,
        positionsDeleted: current.positionsDeleted,
        analysisRowsDeleted: current.analysisRowsDeleted,
        cacheRowsDeleted: current.cacheRowsDeleted,
        skippedReferenced: current.skippedReferenced,
        retryCount: current.retryCount,
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
      throw new Error(`Position cleanup run ${run.id} is non-terminal but no worker claim was available.`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
