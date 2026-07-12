import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import { MarathonMode, MarathonNextResponse, MarathonScopeType, RepertoireColor, TrainingReviewItem } from '../data-access/lines.models';
import { MarathonInitializeOptions } from '../helpers/marathon-query.helpers';

@Injectable()
export class TrainingMarathonStore {
  private readonly api = inject(LinesApiService);
  private readonly recentSublineHashes = signal<string[]>([]);
  private readonly countedCompletedSessionIds = new Set<number>();
  private readonly runId = signal<string | null>(null);
  private requestVersion = 0;

  readonly scopeType = signal<MarathonScopeType>('CHAPTER');
  readonly scopeId = signal<number | null>(null);
  readonly selectedLineIds = signal<number[]>([]);
  readonly selectedSublineHashes = signal<string[]>([]);
  readonly lineId = signal(0);
  readonly lineName = signal('');
  readonly mode = signal<MarathonMode>('ALL');
  readonly sublineHash = signal<string | null>(null);
  readonly sublineMoveText = signal<string | null>(null);
  readonly sideToTrain = signal<RepertoireColor>('WHITE');
  readonly sessionId = signal(0);
  readonly currentFen = signal('');
  readonly expectedMove = signal<string | null | undefined>(undefined);
  readonly feedback = signal<string | null>(null);
  readonly feedbackCorrect = signal(false);
  readonly mistakesCount = signal(0);
  readonly completed = signal(false);
  readonly passed = signal(false);
  readonly accuracy = signal<number | null>(null);
  readonly showExpectedMove = signal(false);
  readonly reviewLoading = signal(false);
  readonly mistakes = signal<TrainingReviewItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loaded = signal(false);
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly boardPositionVersion = signal(0);
  readonly completedThisRun = signal(0);

  readonly backLink = computed<readonly (string | number)[]>(() =>
    this.scopeId()
      ? this.scopeType() === 'COURSE'
        ? ['/courses', this.scopeId()!]
        : ['/chapters', this.scopeId()!, 'lines']
      : ['/library'],
  );
  readonly backLabel = computed(() => (this.scopeId() ? (this.scopeType() === 'COURSE' ? 'Course' : 'Chapter lines') : 'Study'));
  readonly marathonTitle = computed(() => {
    if (this.selectedSublineHashes().length > 0) return 'Selected subline marathon';
    if (this.selectedLineIds().length > 0) return 'Selected line marathon';
    return this.scopeType() === 'COURSE' ? 'Course marathon' : 'Chapter marathon';
  });
  readonly sourceSummary = computed(() => {
    if (this.selectedSublineHashes().length > 0) return `${this.selectedSublineHashes().length} selected sublines`;
    if (this.selectedLineIds().length > 0) return `${this.selectedLineIds().length} selected lines`;
    return this.scopeType() === 'COURSE' ? 'Whole course' : 'Whole chapter';
  });

  initialize(options: MarathonInitializeOptions): void {
    if (!options.scope && !options.lineIds?.length && !options.sublineHashes?.length) {
      this.error.set('Invalid marathon scope.');
      return;
    }
    if (options.scope) {
      this.scopeType.set(options.scope.type);
      this.scopeId.set(options.scope.id);
    } else {
      this.scopeId.set(null);
    }
    this.mode.set(options.mode ?? 'ALL');
    this.selectedLineIds.set(options.lineIds ?? []);
    this.selectedSublineHashes.set(options.sublineHashes ?? []);
    this.recentSublineHashes.set([]);
    this.runId.set(null);
    this.completedThisRun.set(0);
    this.countedCompletedSessionIds.clear();
    void this.startNextLine();
  }

  async startNextLine(): Promise<void> {
    const requestVersion = ++this.requestVersion;
    this.loaded.set(false);
    this.error.set(null);
    try {
      const response = await this.loadNextRunLine(requestVersion, true);
      if (!response) return;
      if (requestVersion !== this.requestVersion) return;
      this.lineId.set(response.line.id);
      this.lineName.set(response.line.name);
      this.sideToTrain.set(response.line.sideToTrain);
      this.resetSessionState();
      this.sessionId.set(response.session.sessionId);
      this.sublineHash.set(response.subline.hash);
      this.sublineMoveText.set(response.subline.moveText || response.session.sublineMoveText || null);
      this.currentFen.set(response.session.fen);
      this.expectedMove.set(response.session.expectedMove);
      this.completed.set(response.session.completed ?? false);
      this.boardPositionVersion.update((version) => version + 1);
      this.rememberSubline(response.subline.hash);
      this.loaded.set(true);
      if (response.session.completed) await this.completeSession(false, null, 0);
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.error.set(readLinesError(error, 'Could not start marathon training.'));
    }
  }

  private async loadNextRunLine(
    requestVersion: number,
    allowRunRecovery: boolean,
  ): Promise<MarathonNextResponse | null> {
    let runId = this.runId();
    if (!runId) {
      const run = await firstValueFrom(this.api.createMarathonRun({
        scope: this.scopeId() ? { type: this.scopeType(), id: this.scopeId()! } : undefined,
        mode: this.mode(), lineIds: this.selectedLineIds(), sublineHashes: this.selectedSublineHashes(),
      }));
      if (requestVersion !== this.requestVersion) return null;
      runId = run.runId;
      this.runId.set(runId);
    }
    try {
      const response = await firstValueFrom(this.api.startNextMarathonRunLine(runId));
      return requestVersion === this.requestVersion ? response : null;
    } catch (error) {
      if (allowRunRecovery && isNotFound(error) && requestVersion === this.requestVersion) {
        this.runId.set(null);
        return this.loadNextRunLine(requestVersion, false);
      }
      throw error;
    }
  }

  async playBoardMove(uci: string): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId || this.completed()) return;
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.playTrainingMove(sessionId, uci));
      this.currentFen.set(result.fen);
      this.expectedMove.set(result.nextExpectedMove);
      this.mistakesCount.set(result.mistakesCount ?? this.mistakesCount());
      if (result.correct) {
        const lastPlayedMove = result.playedMoves.at(-1)?.moveUci || uci;
        this.lastMove.set({ from: lastPlayedMove.substring(0, 2), to: lastPlayedMove.substring(2, 4) });
        this.feedback.set('Correct!');
        this.feedbackCorrect.set(true);
      } else {
        this.lastMove.set(null);
        this.boardPositionVersion.update((version) => version + 1);
        this.feedback.set(
          this.showExpectedMove()
            ? `Incorrect. Expected ${result.expectedMove || '(waiting...)'}. Try it again.`
            : 'Incorrect. Same position - try again.',
        );
        this.feedbackCorrect.set(false);
      }
      if (result.completed) await this.completeSession(result.result === 'PASSED', result.accuracy, result.mistakesCount);
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not play move.'));
    }
  }

  toggleExpectedMove(): void {
    this.showExpectedMove.update((value) => !value);
  }

  setMode(mode: MarathonMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.runId.set(null);
    this.recentSublineHashes.set([]);
    this.completedThisRun.set(0);
    this.countedCompletedSessionIds.clear();
    void this.startNextLine();
  }

  switchMode(mode: MarathonMode): void {
    this.setMode(mode);
  }

  async finishTraining(): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId || this.completed()) return;
    try {
      const result = await firstValueFrom(this.api.completeTraining(sessionId));
      await this.completeSession(result.result === 'PASSED', result.accuracy, result.mistakesCount);
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not finish training.'));
    }
  }

  private async completeSession(passed: boolean, accuracy: number | null, mistakesCount: number): Promise<void> {
    this.completed.set(true);
    this.passed.set(passed);
    this.accuracy.set(accuracy);
    this.mistakesCount.set(mistakesCount ?? this.mistakesCount());
    const sessionId = this.sessionId();
    if (!this.countedCompletedSessionIds.has(sessionId)) {
      this.countedCompletedSessionIds.add(sessionId);
      this.completedThisRun.update((count) => count + 1);
    }
    await this.loadReview();
  }

  private async loadReview(): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId) return;
    this.reviewLoading.set(true);
    try {
      this.mistakes.set((await firstValueFrom(this.api.getTrainingReview(sessionId))).mistakes ?? []);
    } catch {
      this.mistakes.set([]);
    } finally {
      this.reviewLoading.set(false);
    }
  }

  private rememberSubline(hash: string): void {
    this.recentSublineHashes.update((hashes) => [...hashes.filter((item) => item !== hash), hash].slice(-20));
  }

  private resetSessionState(): void {
    this.feedback.set(null);
    this.sublineHash.set(null);
    this.sublineMoveText.set(null);
    this.feedbackCorrect.set(false);
    this.mistakesCount.set(0);
    this.completed.set(false);
    this.passed.set(false);
    this.accuracy.set(null);
    this.showExpectedMove.set(false);
    this.reviewLoading.set(false);
    this.mistakes.set([]);
    this.lastMove.set(null);
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}
