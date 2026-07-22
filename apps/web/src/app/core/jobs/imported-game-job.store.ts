import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  CreateImportedGameJobRunResponse,
  JobRunKind,
  JobRunStatus,
  JobRunSummary,
  JobTask,
} from '@chess-trainer/contracts/jobs';
import { firstValueFrom } from 'rxjs';
import { ImportedGameJobApiService } from './imported-game-job-api.service';

const ACTIVE_JOB_STATUSES: ReadonlySet<JobRunStatus> = new Set(['QUEUED', 'RUNNING']);
const ACTIVE_TASK_STATUSES: ReadonlySet<JobTask['status']> = new Set(['QUEUED', 'RUNNING']);
const POLL_INTERVAL_MS = 1_500;
const MAX_VISIBLE_TERMINAL_RUNS = 3;
const RECENT_JOB_HISTORY_LIMIT = 100;

export interface ImportedGameJobTerminalBatch {
  sequence: number;
  runs: readonly JobRunSummary[];
  gameIds: readonly number[];
}

export interface ImportedGameJobSettledGameBatch {
  sequence: number;
  gameIds: readonly number[];
}

@Injectable({ providedIn: 'root' })
export class ImportedGameJobStore {
  private readonly api = inject(ImportedGameJobApiService);
  private readonly runsState = signal<JobRunSummary[]>([]);
  private readonly gameIdsByRunState = signal<Record<number, readonly number[]>>({});
  private readonly taskStatusesByRunState = signal<
    Record<number, Readonly<Record<number, JobTask['status']>>>
  >({});
  private pollTimer?: ReturnType<typeof setTimeout>;
  private initializationInFlight: Promise<void> | null = null;
  private refreshInFlight: Promise<void> | null = null;
  private initialized = false;
  private sessionGeneration = 0;
  private terminalSequence = 0;
  private settledGameSequence = 0;

  readonly runs = this.runsState.asReadonly();
  readonly gameIdsByRun = this.gameIdsByRunState.asReadonly();
  readonly taskStatusesByRun = this.taskStatusesByRunState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly expanded = signal(true);
  readonly pollVersion = signal(0);
  readonly terminalBatch = signal<ImportedGameJobTerminalBatch | null>(null);
  readonly settledGameBatch = signal<ImportedGameJobSettledGameBatch | null>(null);
  readonly cancellingRunId = signal<number | null>(null);
  readonly retryingRunId = signal<number | null>(null);
  readonly dismissingRunId = signal<number | null>(null);

  readonly activeRuns = computed(() =>
    this.runsState().filter((run) => isActiveStatus(run.status)),
  );
  readonly hasActiveJobs = computed(() => this.activeRuns().length > 0);
  readonly visibleRuns = computed(() => {
    const runs = this.runsState();
    const active = runs.filter((run) => isActiveStatus(run.status));
    const terminal = runs
      .filter((run) => !isActiveStatus(run.status))
      .slice(0, MAX_VISIBLE_TERMINAL_RUNS);
    return [...active, ...terminal].sort(compareNewestFirst);
  });

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationInFlight) return this.initializationInFlight;

    const generation = this.sessionGeneration;
    const task = this.performInitialization(generation);
    this.initializationInFlight = task;

    try {
      await task;
    } finally {
      if (this.initializationInFlight === task) this.initializationInFlight = null;
    }
  }

  reset(): void {
    this.sessionGeneration += 1;
    this.stopPolling();
    this.initialized = false;
    this.initializationInFlight = null;
    this.refreshInFlight = null;
    this.runsState.set([]);
    this.gameIdsByRunState.set({});
    this.taskStatusesByRunState.set({});
    this.loading.set(false);
    this.error.set(null);
    this.terminalBatch.set(null);
    this.settledGameBatch.set(null);
    this.pollVersion.set(0);
    this.cancellingRunId.set(null);
    this.retryingRunId.set(null);
    this.dismissingRunId.set(null);
  }

  async dismiss(jobRunId: number): Promise<void> {
    if (this.dismissingRunId() !== null) return;

    const run = this.runsState().find((candidate) => candidate.id === jobRunId);
    if (!run || isActiveStatus(run.status)) return;

    const generation = this.sessionGeneration;
    this.dismissingRunId.set(jobRunId);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.dismissJob(jobRunId));
      if (!this.isCurrentGeneration(generation)) return;

      this.runsState.update((runs) => runs.filter((candidate) => candidate.id !== jobRunId));
      this.gameIdsByRunState.update((gameIdsByRun) => {
        const { [jobRunId]: dismissed, ...remaining } = gameIdsByRun;
        void dismissed;
        return remaining;
      });
      this.taskStatusesByRunState.update((taskStatusesByRun) => {
        const { [jobRunId]: dismissed, ...remaining } = taskStatusesByRun;
        void dismissed;
        return remaining;
      });
    } catch (error) {
      if (this.isCurrentGeneration(generation)) {
        this.error.set(readError(error, 'Could not dismiss imported-game job.'));
      }
    } finally {
      if (this.isCurrentGeneration(generation) && this.dismissingRunId() === jobRunId) {
        this.dismissingRunId.set(null);
      }
    }
  }

  async submit(
    kind: JobRunKind,
    gameIds: readonly number[],
    force = false,
  ): Promise<CreateImportedGameJobRunResponse> {
    const uniqueGameIds = Array.from(
      new Set(gameIds.filter((gameId) => Number.isInteger(gameId) && gameId > 0)),
    );
    if (!uniqueGameIds.length) throw new Error('Select at least one imported game.');

    const generation = this.sessionGeneration;
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.createJob(kind, uniqueGameIds, force));
      if (!this.isCurrentGeneration(generation)) return response;

      const rejected = new Set(response.rejectedGameIds);
      const acceptedGameIds = uniqueGameIds.filter((gameId) => !rejected.has(gameId));
      this.setRunGameIds(response.jobRun.id, acceptedGameIds);
      this.setRunTaskStatuses(
        response.jobRun.id,
        Object.fromEntries(acceptedGameIds.map((gameId) => [gameId, 'QUEUED' as const])),
      );
      this.mergeRuns([response.jobRun]);
      this.expanded.set(true);
      this.pollVersion.update((version) => version + 1);
      this.schedulePoll(350, generation);
      return response;
    } catch (error) {
      if (this.isCurrentGeneration(generation)) {
        const message = readError(error, 'Could not submit imported-game job.');
        this.error.set(message);
      }
      throw error;
    }
  }

  async cancel(jobRunId: number): Promise<void> {
    if (this.cancellingRunId() !== null) return;

    const generation = this.sessionGeneration;
    const previous = this.runsState().find((run) => run.id === jobRunId) ?? null;
    this.cancellingRunId.set(jobRunId);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.cancelJob(jobRunId));
      if (!this.isCurrentGeneration(generation)) return;

      this.mergeRuns([response.jobRun]);
      if (previous && isActiveStatus(previous.status) && !isActiveStatus(response.jobRun.status)) {
        this.publishTerminalBatch([response.jobRun]);
      }
      this.pollVersion.update((version) => version + 1);
      if (this.activeRuns().length) this.schedulePoll(350, generation);
      else this.stopPolling();
    } catch (error) {
      if (this.isCurrentGeneration(generation)) {
        this.error.set(readError(error, 'Could not cancel imported-game job.'));
      }
    } finally {
      if (this.isCurrentGeneration(generation) && this.cancellingRunId() === jobRunId) {
        this.cancellingRunId.set(null);
      }
    }
  }

  async retry(jobRunId: number): Promise<void> {
    if (this.retryingRunId() !== null) return;

    const generation = this.sessionGeneration;
    this.retryingRunId.set(jobRunId);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.retryJob(jobRunId));
      if (!this.isCurrentGeneration(generation)) return;

      this.mergeRuns([response.jobRun]);
      this.expanded.set(true);
      this.pollVersion.update((version) => version + 1);
      this.schedulePoll(350, generation);
      try {
        await this.refreshRunTasks(response.jobRun.id, generation, false);
      } catch (error) {
        if (this.isCurrentGeneration(generation)) {
          this.error.set(readError(error, 'Retry started, but its game list could not be loaded.'));
        }
      }
    } catch (error) {
      if (this.isCurrentGeneration(generation)) {
        this.error.set(readError(error, 'Could not retry imported-game job.'));
      }
    } finally {
      if (this.isCurrentGeneration(generation) && this.retryingRunId() === jobRunId) {
        this.retryingRunId.set(null);
      }
    }
  }

  activeRunForGame(
    gameId: number,
    kinds?: readonly JobRunKind[],
  ): JobRunSummary | null {
    return this.activeRuns().find((run) => {
      if (kinds && !kinds.includes(run.kind)) return false;
      return isActiveTaskStatus(this.taskStatusForGame(run.id, gameId));
    }) ?? null;
  }

  isGameActive(gameId: number, kinds?: readonly JobRunKind[]): boolean {
    return this.activeRunForGame(gameId, kinds) !== null;
  }

  gameIdsForRun(jobRunId: number): readonly number[] {
    return this.gameIdsByRunState()[jobRunId] ?? [];
  }

  taskStatusForGame(jobRunId: number, gameId: number): JobTask['status'] | null {
    return this.taskStatusesByRunState()[jobRunId]?.[gameId] ?? null;
  }

  toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  private async performInitialization(generation: number): Promise<void> {
    if (!this.isCurrentGeneration(generation)) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const activeResponse = await firstValueFrom(this.api.listJobs(true));
      if (!this.isCurrentGeneration(generation)) return;

      const recentResponse = await firstValueFrom(
        this.api.listJobs(false, RECENT_JOB_HISTORY_LIMIT),
      );
      if (!this.isCurrentGeneration(generation)) return;

      const recentTerminalRuns = recentResponse.items
        .filter((run) => !isActiveStatus(run.status))
        .slice(0, MAX_VISIBLE_TERMINAL_RUNS);
      const restoredRuns = [...activeResponse.items, ...recentTerminalRuns];

      this.mergeRuns(restoredRuns);
      if (activeResponse.items.length) this.schedulePoll(POLL_INTERVAL_MS, generation);
      else this.stopPolling();

      await Promise.all(
        restoredRuns.map((run) => this.refreshRunTasks(run.id, generation, false)),
      );
      if (!this.isCurrentGeneration(generation)) return;

      this.initialized = true;
      this.error.set(null);
    } catch (error) {
      if (!this.isCurrentGeneration(generation)) return;

      this.initialized = false;
      this.error.set(readError(error, 'Could not load imported-game jobs.'));
      if (this.activeRuns().length) this.schedulePoll(POLL_INTERVAL_MS, generation);
    } finally {
      if (this.isCurrentGeneration(generation)) this.loading.set(false);
    }
  }

  private schedulePoll(
    delay = POLL_INTERVAL_MS,
    generation = this.sessionGeneration,
  ): void {
    if (!this.isCurrentGeneration(generation)) return;

    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      if (!this.isCurrentGeneration(generation)) return;
      void this.refreshActiveJobs(generation);
    }, delay);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
  }

  private refreshActiveJobs(generation = this.sessionGeneration): Promise<void> {
    if (!this.isCurrentGeneration(generation)) return Promise.resolve();
    if (this.refreshInFlight) return this.refreshInFlight;

    const task = this.performActiveRefresh(generation);
    this.refreshInFlight = task;
    void task.finally(() => {
      if (this.refreshInFlight === task) this.refreshInFlight = null;
    });
    return task;
  }

  private async performActiveRefresh(generation: number): Promise<void> {
    if (!this.isCurrentGeneration(generation)) return;

    const previousActiveRuns = this.activeRuns();
    const previousActiveById = new Map(previousActiveRuns.map((run) => [run.id, run]));

    try {
      const response = await firstValueFrom(this.api.listJobs(true));
      if (!this.isCurrentGeneration(generation)) return;

      const activeRunIds = new Set(response.items.map((run) => run.id));
      const disappearedRuns = previousActiveRuns.filter((run) => !activeRunIds.has(run.id));
      const terminalRuns = await Promise.all(
        disappearedRuns.map(async (run) => {
          try {
            const result = await firstValueFrom(this.api.getJob(run.id));
            return this.isCurrentGeneration(generation) ? result.jobRun : null;
          } catch {
            return null;
          }
        }),
      );
      if (!this.isCurrentGeneration(generation)) return;

      const settledRuns = terminalRuns.filter((run): run is JobRunSummary => run !== null);
      this.mergeRuns([...response.items, ...settledRuns]);
      const settledGameIds = (await Promise.all(
        [...response.items, ...settledRuns].map((run) =>
          this.refreshRunTasks(run.id, generation, true),
        ),
      )).flat();
      if (!this.isCurrentGeneration(generation)) return;

      if (settledGameIds.length) this.publishSettledGameBatch(settledGameIds);

      const newlyTerminal = settledRuns.filter((run) => {
        const previous = previousActiveById.get(run.id);
        return Boolean(previous && isActiveStatus(previous.status) && !isActiveStatus(run.status));
      });
      if (newlyTerminal.length) this.publishTerminalBatch(newlyTerminal);

      this.initialized = true;
      this.error.set(null);
      this.pollVersion.update((version) => version + 1);

      if (this.activeRuns().length) this.schedulePoll(POLL_INTERVAL_MS, generation);
      else this.stopPolling();
    } catch (error) {
      if (!this.isCurrentGeneration(generation)) return;

      this.error.set(readError(error, 'Could not refresh active jobs.'));
      if (this.activeRuns().length) this.schedulePoll(POLL_INTERVAL_MS, generation);
    }
  }

  private async refreshRunTasks(jobRunId: number, generation: number, force: boolean): Promise<readonly number[]> {
    if (!this.isCurrentGeneration(generation)) return [];
    if (!force && Object.prototype.hasOwnProperty.call(this.gameIdsByRunState(), jobRunId)) return [];
    const gameIds: number[] = [];
    const taskStatuses: Record<number, JobTask['status']> = {};
    let offset = 0;
    let total = 0;
    do {
      const response = await firstValueFrom(this.api.listTasks(jobRunId, offset));
      if (!this.isCurrentGeneration(generation)) return [];
      total = response.total;
      for (const task of response.items) {
        if (task.importedGameId !== null) {
          gameIds.push(task.importedGameId);
          taskStatuses[task.importedGameId] = task.status;
        }
      }
      offset += response.items.length;
      if (!response.items.length) break;
    } while (offset < total);
    if (!this.isCurrentGeneration(generation)) return [];
    const previousStatuses = this.taskStatusesByRunState()[jobRunId] ?? {};
    const newlySettledGameIds = Object.entries(taskStatuses)
      .filter(([gameId, status]) => isActiveTaskStatus(previousStatuses[Number(gameId)] ?? null) && !isActiveTaskStatus(status))
      .map(([gameId]) => Number(gameId));
    this.setRunGameIds(jobRunId, gameIds);
    this.setRunTaskStatuses(jobRunId, taskStatuses);
    return newlySettledGameIds;
  }
  private setRunGameIds(jobRunId: number, gameIds: readonly number[]): void {
    this.gameIdsByRunState.update((current) => ({
      ...current,
      [jobRunId]: Array.from(new Set(gameIds)),
    }));
  }

  private setRunTaskStatuses(jobRunId: number, taskStatuses: Readonly<Record<number, JobTask['status']>>): void {
    this.taskStatusesByRunState.update((current) => ({ ...current, [jobRunId]: { ...taskStatuses } }));
  }

  private mergeRuns(incoming: readonly JobRunSummary[]): void {
    this.runsState.update((current) => {
      const byId = new Map(current.map((run) => [run.id, run]));
      for (const run of incoming) byId.set(run.id, run);
      const sorted = Array.from(byId.values()).sort(compareNewestFirst);
      const active = sorted.filter((run) => isActiveStatus(run.status));
      const terminal = sorted
        .filter((run) => !isActiveStatus(run.status))
        .slice(0, MAX_VISIBLE_TERMINAL_RUNS);
      return [...active, ...terminal].sort(compareNewestFirst);
    });
  }

  private publishTerminalBatch(runs: readonly JobRunSummary[]): void {
    const gameIds = Array.from(
      new Set(runs.flatMap((run) => [...this.gameIdsForRun(run.id)])),
    );
    this.terminalSequence += 1;
    this.terminalBatch.set({
      sequence: this.terminalSequence,
      runs,
      gameIds,
    });
  }

  private publishSettledGameBatch(gameIds: readonly number[]): void {
    const uniqueGameIds = Array.from(new Set(gameIds));
    if (!uniqueGameIds.length) return;
    this.settledGameSequence += 1;
    this.settledGameBatch.set({ sequence: this.settledGameSequence, gameIds: uniqueGameIds });
  }

  private isCurrentGeneration(generation: number): boolean {
    return generation === this.sessionGeneration;
  }
}

function isActiveStatus(status: JobRunStatus): boolean {
  return ACTIVE_JOB_STATUSES.has(status);
}

function isActiveTaskStatus(status: JobTask['status'] | null): boolean {
  return status !== null && ACTIVE_TASK_STATUSES.has(status);
}

function compareNewestFirst(left: JobRunSummary, right: JobRunSummary): number {
  return right.createdAt.localeCompare(left.createdAt) || right.id - left.id;
}

function readError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };
    return candidate.error?.message || candidate.error?.error || candidate.message || fallback;
  }
  return fallback;
}
