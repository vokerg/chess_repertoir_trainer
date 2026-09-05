import {
  POSITION_CLEANUP_POLICY_VERSION,
  type PositionCleanupConfig,
} from './position-cleanup.config';
import {
  PositionCleanupRepository,
  type PositionCleanupRepository as PositionCleanupRepositoryBoundary,
} from './position-cleanup.repository.prisma';
import type { PositionCleanupMode, PositionCleanupRun } from './position-cleanup.types';

const DAY_MS = 24 * 60 * 60_000;
export const POSITION_CLEANUP_EXECUTE_CONFIRMATION = 'DELETE_ORPHAN_POSITIONS';

export interface PositionCleanupPolicyPreview {
  mode: PositionCleanupMode;
  policyVersion: string;
  graceDays: number;
  graceCutoff: Date;
  inputPageSize: number;
  deleteBatchSize: number;
  lockTimeoutMs: number;
  observational: boolean;
  postgresServerVersionNum: number;
}

export interface CreatePositionCleanupInput {
  mode?: PositionCleanupMode;
  requestedBy: string;
  confirmation?: string;
}

export interface PositionCleanupService {
  preview(mode?: PositionCleanupMode): Promise<PositionCleanupPolicyPreview>;
  create(input: CreatePositionCleanupInput): Promise<PositionCleanupRun>;
  status(runId: number): Promise<PositionCleanupRun>;
  cancel(runId: number): Promise<PositionCleanupRun>;
}

export function createPositionCleanupService(input: {
  config: PositionCleanupConfig;
  repository?: PositionCleanupRepositoryBoundary;
  now?: () => number;
}): PositionCleanupService {
  const repository = input.repository ?? PositionCleanupRepository;
  const now = input.now ?? Date.now;

  const preview = async (mode: PositionCleanupMode = 'DRY_RUN'): Promise<PositionCleanupPolicyPreview> => {
    assertEnabled(input.config);
    validateMode(mode);
    const postgresServerVersionNum = await repository.assertDatabaseCapability();
    return {
      mode,
      policyVersion: POSITION_CLEANUP_POLICY_VERSION,
      graceDays: input.config.graceDays,
      graceCutoff: new Date(now() - input.config.graceDays * DAY_MS),
      inputPageSize: input.config.inputPageSize,
      deleteBatchSize: input.config.deleteBatchSize,
      lockTimeoutMs: input.config.lockTimeoutMs,
      observational: mode === 'DRY_RUN',
      postgresServerVersionNum,
    };
  };

  return {
    preview,
    async create(createInput) {
      const mode = createInput.mode ?? 'DRY_RUN';
      validateMode(mode);
      validateRequestedBy(createInput.requestedBy);
      if (mode === 'EXECUTE' && createInput.confirmation !== POSITION_CLEANUP_EXECUTE_CONFIRMATION) {
        throw new Error(
          `EXECUTE cleanup requires confirmation ${POSITION_CLEANUP_EXECUTE_CONFIRMATION}.`,
        );
      }
      const policy = await preview(mode);
      return repository.createRun({
        mode,
        policyVersion: policy.policyVersion,
        graceDays: policy.graceDays,
        graceCutoff: policy.graceCutoff,
        inputPageSize: policy.inputPageSize,
        deleteBatchSize: policy.deleteBatchSize,
        lockTimeoutMs: policy.lockTimeoutMs,
        requestedBy: createInput.requestedBy,
      });
    },
    async status(runId) {
      const run = await repository.getRun(runId);
      if (!run) throw new Error(`Position cleanup run ${runId} was not found.`);
      return run;
    },
    cancel(runId) {
      return repository.requestCancel(runId);
    },
  };
}

function assertEnabled(config: PositionCleanupConfig): void {
  if (!config.enabled) {
    throw new Error(
      'Position cleanup is disabled. Set POSITION_CLEANUP_ENABLED=true only for an explicitly approved manual operation.',
    );
  }
}

function validateMode(mode: PositionCleanupMode): void {
  if (mode !== 'DRY_RUN' && mode !== 'EXECUTE') throw new Error('Invalid position cleanup mode.');
}

function validateRequestedBy(requestedBy: string): void {
  if (!requestedBy.trim() || requestedBy.length > 80) {
    throw new Error('Position cleanup requestedBy must contain 1-80 characters.');
  }
}
