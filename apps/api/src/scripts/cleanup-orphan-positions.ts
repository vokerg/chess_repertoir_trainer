import 'dotenv/config';
import prisma from '../prisma';
import { loadPositionCleanupConfig } from '../modules/position-cleanup/position-cleanup.config';
import type { PositionCleanupConfig } from '../modules/position-cleanup/position-cleanup.config';
import {
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  createPositionCleanupService,
  type PositionCleanupService,
} from '../modules/position-cleanup/position-cleanup.service';
import { isPositionCleanupTerminal } from '../modules/position-cleanup/position-cleanup.types';
import {
  createPositionCleanupWorker,
  type PositionCleanupWorker,
} from '../modules/position-cleanup/position-cleanup.worker.service';

export interface PositionCleanupCommandInput {
  apply: boolean;
  confirmation?: string;
  config: PositionCleanupConfig;
  service: PositionCleanupService;
  worker: PositionCleanupWorker;
  log?: (message: string) => void;
  wait?: (delayMs: number) => Promise<void>;
}

export async function runPositionCleanupCommand(input: PositionCleanupCommandInput): Promise<boolean> {
  const log = input.log ?? ((message: string) => console.log(message));
  const waitForPoll = input.wait ?? wait;
  const mode = input.apply ? 'EXECUTE' : 'DRY_RUN';

  if (input.apply && input.confirmation !== POSITION_CLEANUP_EXECUTE_CONFIRMATION) {
    throw new Error(
      `Execution requires --apply --confirm=${POSITION_CLEANUP_EXECUTE_CONFIRMATION}.`,
    );
  }

  const preview = await input.service.preview(mode);
  log(JSON.stringify({
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

  if (!input.apply) {
    log(
      `Dry-run is observational across bounded transactions. Re-run with --apply --confirm=${POSITION_CLEANUP_EXECUTE_CONFIRMATION} only after reviewing the result.`,
    );
  }

  const run = await input.service.create({
    mode,
    requestedBy: 'server-command:position-cleanup',
    confirmation: input.confirmation,
  });
  log(JSON.stringify({ runId: run.id, status: run.status, phase: run.phase }));

  for (;;) {
    const current = await input.service.status(run.id);
    if (isPositionCleanupTerminal(current.status)) {
      log(JSON.stringify({
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
        orphansObserved: current.orphansObserved,
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
      return current.status === 'COMPLETED';
    }

    const didWork = await input.worker.runOnce();
    if (!didWork) {
      // A separately running persistent worker may own the same durable run. Do not
      // turn a healthy exact-work-key claim into a false CLI failure; poll status and
      // opportunistically claim again after the normal cleanup poll interval.
      await waitForPoll(input.config.pollIntervalMs);
    }
  }
}

async function main(): Promise<void> {
  const config = loadPositionCleanupConfig();
  const service = createPositionCleanupService({ config });
  const worker = createPositionCleanupWorker({ config });
  const completed = await runPositionCleanupCommand({
    apply: process.argv.includes('--apply'),
    confirmation: process.argv
      .find((argument) => argument.startsWith('--confirm='))
      ?.slice('--confirm='.length),
    config,
    service,
    worker,
  });
  if (!completed) process.exitCode = 1;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
