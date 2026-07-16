import type { JobRunKind } from '@chess-trainer/contracts/jobs';

export interface ClaimedJobTask {
  id: number;
  jobRunId: number;
  userId: number;
  kind: JobRunKind;
  priority: number;
  importedGameId: number;
  ordinal: number;
  force: boolean;
  workKey: string;
}

export type JobTaskExecutionStatus = 'COMPLETED' | 'SKIPPED';

export interface JobTaskExecutionContext {
  signal: AbortSignal;
}

export interface JobTaskExecutor {
  readonly kind: JobRunKind;
  execute(
    task: ClaimedJobTask,
    context: JobTaskExecutionContext,
  ): Promise<JobTaskExecutionStatus>;
}

export class JobTaskExecutorRegistry {
  private readonly byKind = new Map<JobRunKind, JobTaskExecutor>();

  constructor(executors: readonly JobTaskExecutor[]) {
    for (const executor of executors) {
      if (this.byKind.has(executor.kind)) {
        throw new Error(`Duplicate job-task executor for ${executor.kind}.`);
      }
      this.byKind.set(executor.kind, executor);
    }
  }

  supportedKinds(): JobRunKind[] {
    return Array.from(this.byKind.keys());
  }

  get(kind: JobRunKind): JobTaskExecutor | null {
    return this.byKind.get(kind) ?? null;
  }
}

// PR2 establishes the worker boundary only. PR3 registers the imported-game
// indexing, analysis, processing, and tag-refresh executors here.
export const defaultJobTaskExecutorRegistry = new JobTaskExecutorRegistry([]);
