import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  CreateImportedGameJobRunResponse,
  JobRunKind,
  JobRunStatus,
  JobRunSummary,
} from '@chess-trainer/contracts/jobs';
import { firstValueFrom } from 'rxjs';
import { ImportedGameJobApiService } from './imported-game-job-api.service';

const ACTIVE_JOB_STATUSES: ReadonlySet<JobRunStatus> = new Set(['QUEUED', 'RUNNING']);
const POLL_INTERVAL_MS = 1_500;
const MAX_VISIBLE_TERMINAL_RUNS = 3;

export interface ImportedGameJobTerminalBatch {
  sequence: number;
  runs: readonly JobRunSummary[];
  gameIds: readonly number[];
}

@Injectable({ providedIn: 'root' })
export class ImportedGameJobStore {
  private readonly api = inject(ImportedGameJobApiService);
  private readonly runsState = signal<JobRunSummary[]>([]);
  private readonly gameIdsByRunState = signal<Record<number, readonly number[]>>({});
  private pollTimer?: ReturnType<typeof setTimeout>;
  private refreshInFlight: Promise<void> | null = null;
  private initialized = false;
  private terminalSequence = 0;

  readonly runs = this.runsState.asReadonly();
  readonly gameIdsByRun = this.gameIdsByRunState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly expanded = signal(true);
  readonly pollVersion = signal(0);
  readonly terminalBatch = signal<ImportedGameJobTerminalBatch | null>(null);

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
    this.initialized = true;
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.listJobs(true));
      this.mergeRuns(response.items);
      await Promise.all(response.items.map((run) => this.ensureRunGameIds(run.id)));
      if (response.items.length) this.schedulePoll(0);
    } catch (error) {
      this.error.set(readError(error, 'Could not load active jobs.'));
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.stopPolling();
    this.initialized = false;
    this.refreshInFlight = null;
    this.runsState.set([]);
    this.gameIdsByRunState.set({});
    this.loading.set(false);
    this.error.set(null);
    this.terminalBatch.set(null);
    this.pollVersion.set(0);
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

    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.createJob(kind, uniqueGameIds, force));
      const rejected = new Set(response.rejectedGameIds);
      const acceptedGameIds = uniqueGameIds.filter((gameId) => !rejected.has(gameId));
      this.setRunGameIds(response.jobRun.id, acceptedGameIds);
      this.mergeRuns([response.jobRun]);
      this.expanded.set(true);
      this.pollVersion.update((version) => version + 1);
      this.schedulePoll(350);
      return response;
    } catch (error) {
      const message = readError(error, 'Could not submit imported-game job.');
      this.error.set(message);
      throw error;
    }
  }

  activeRunForGame(
    gameId: number,
    kinds?: readonly JobRunKind[],
  ): JobRunSummary | null {
    return this.activeRuns().find((run) => {
      if (kinds && !kinds.includes(run.kind)) return false;
      return this.gameIdsForRun(run.id).includes(gameId);
    }) ?? null;
  }

  isGameActive(gameId: number, kinds?: readonly JobRunKind[]): boolean {
    return this.activeRunForGame(gameId, kinds) !== null;
  }

  gameIdsForRun(jobRunId: number): readonly number[] {
    return this.gameIdsByRunState()[jobRunId] ?? [];
  }

  toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  private schedulePoll(delay = POLL_INTERVAL_MS): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      void this.refreshActiveJobs();
    }, delay);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
  }

  private refreshActiveJobs(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const task = this.performActiveRefresh();
    this.refreshInFlight = task;
    void task.finally(() => {
      if (this.refreshInFlight === task) this.refreshInFlight = null;
    });
    return task;
  }

  private async performActiveRefresh(): Promise<void> {
    const previousActiveRuns = this.activeRuns();
    const previousActiveById = new Map(previousActiveRuns.map((run) => [run.id, run]));

    try {
      const response = await firstValueFrom(this.api.listJobs(true));
      const activeRunIds = new Set(response.items.map((run) => run.id));
      const disappearedRuns = previousActiveRuns.filter((run) => !activeRunIds.has(run.id));
      const terminalRuns = await Promise.all(
        disappearedRuns.map(async (run) => {
          try {
            return (await firstValueFrom(this.api.getJob(run.id))).jobRun;
          } catch {
            return null;
          }
        }),
      );
      const settledRuns = terminalRuns.filter((run): run is JobRunSummary => run !== null);

      this.mergeRuns([...response.items, ...settledRuns]);
      await Promise.all(
        [...response.items, ...settledRuns].map((run) => this.ensureRunGameIds(run.id)),
      );

      const newlyTerminal = settledRuns.filter((run) => {
        const previous = previousActiveById.get(run.id);
        return Boolean(previous && isActiveStatus(previous.status) && !isActiveStatus(run.status));
      });
      if (newlyTerminal.length) this.publishTerminalBatch(newlyTerminal);

      this.error.set(null);
      this.pollVersion.update((version) => version + 1);

      if (this.activeRuns().length) this.schedulePoll();
      else this.stopPolling();
    } catch (error) {
      this.error.set(readError(error, 'Could not refresh active jobs.'));
      if (this.activeRuns().length) this.schedulePoll();
    }
  }

  private async ensureRunGameIds(jobRunId: number): Promise<void> {
    if (Object.prototype.hasOwnProperty.call(this.gameIdsByRunState(), jobRunId)) return;

    const gameIds: number[] = [];
    let offset = 0;
    let total = 0;
    do {
      const response = await firstValueFrom(this.api.listTasks(jobRunId, offset));
      total = response.total;
      for (const task of response.items) {
        if (task.importedGameId !== null) gameIds.push(task.importedGameId);
      }
      offset += response.items.length;
      if (!response.items.length) break;
    } while (offset < total);

    this.setRunGameIds(jobRunId, gameIds);
  }

  private setRunGameIds(jobRunId: number, gameIds: readonly number[]): void {
    this.gameIdsByRunState.update((current) => ({
      ...current,
      [jobRunId]: Array.from(new Set(gameIds)),
    }));
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
}

function isActiveStatus(status: JobRunStatus): boolean {
  return ACTIVE_JOB_STATUSES.has(status);
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
