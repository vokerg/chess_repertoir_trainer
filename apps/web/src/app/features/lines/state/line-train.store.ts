import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import { LineDetail, TrainingReviewItem } from '../data-access/lines.models';

@Injectable()
export class LineTrainStore {
  private readonly api = inject(LinesApiService);

  private readonly lineId = signal<number | null>(null);
  private requestVersion = 0;

  readonly line = signal<LineDetail | null>(null);
  readonly sessionId = signal(0);
  readonly sublineHash = signal<string | null>(null);
  readonly sublineMoveText = signal<string | null>(null);
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
  readonly loading = signal(true);
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly boardPositionVersion = signal(0);

  readonly sideToTrain = computed(() => this.line()?.sideToTrain || 'WHITE');
  readonly lineName = computed(() => this.line()?.name || 'Training focus');
  readonly sessionStatusLabel = computed(() => (this.completed() ? 'Session complete' : 'In progress'));

  initialize(lineId: number): void {
    if (!Number.isFinite(lineId) || lineId <= 0) {
      this.error.set('Invalid line id.');
      this.loading.set(false);
      return;
    }
    this.lineId.set(lineId);
    void this.loadLine();
  }

  async loadLine(): Promise<void> {
    const lineId = this.lineId();
    if (!lineId) return;

    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const line = await firstValueFrom(this.api.getLine(lineId));
      if (requestVersion !== this.requestVersion) return;
      this.line.set(line);
      await this.startTraining(requestVersion);
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.error.set(readLinesError(error, 'Could not load line.'));
      this.loading.set(false);
    }
  }

  async startTraining(expectedRequestVersion = this.requestVersion): Promise<void> {
    const lineId = this.lineId();
    if (!lineId) return;

    this.loading.set(true);
    this.error.set(null);
    this.resetSessionState();

    try {
      const session = await firstValueFrom(this.api.startLineTraining(lineId));
      if (expectedRequestVersion !== this.requestVersion) return;
      this.sessionId.set(session.sessionId);
      this.sublineHash.set(session.sublineHash ?? null);
      this.sublineMoveText.set(session.sublineMoveText ?? null);
      this.currentFen.set(session.fen);
      this.expectedMove.set(session.expectedMove);
      this.completed.set(session.completed ?? false);
      this.boardPositionVersion.update((version) => version + 1);
      this.loading.set(false);

      if (session.completed) {
        this.emitCompletedFromSession();
        await this.loadReview();
      }
    } catch (error) {
      if (expectedRequestVersion !== this.requestVersion) return;
      this.error.set(readLinesError(error, 'Could not start training.'));
      this.loading.set(false);
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

      if (result.completed) {
        this.completed.set(true);
        this.passed.set(result.result === 'PASSED');
        this.accuracy.set(result.accuracy);
        await this.loadReview();
      }
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not play move.'));
    }
  }

  toggleExpectedMove(): void {
    this.showExpectedMove.update((value) => !value);
  }

  async finishTraining(): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId || this.completed()) return;

    try {
      const session = await firstValueFrom(this.api.completeTraining(sessionId));
      if (!session) return;
      this.completed.set(true);
      this.passed.set(session.result === 'PASSED');
      this.accuracy.set(session.accuracy);
      this.mistakesCount.set(session.mistakesCount ?? this.mistakesCount());
      await this.loadReview();
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not finish training.'));
    }
  }

  private async loadReview(): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId) return;

    this.reviewLoading.set(true);
    try {
      const review = await firstValueFrom(this.api.getTrainingReview(sessionId));
      this.mistakes.set(review.mistakes ?? []);
    } catch {
      this.mistakes.set([]);
    } finally {
      this.reviewLoading.set(false);
    }
  }

  private emitCompletedFromSession(): void {
    this.completed.set(true);
    this.passed.set(false);
    this.accuracy.set(null);
  }

  private resetSessionState(): void {
    this.sessionId.set(0);
    this.sublineHash.set(null);
    this.sublineMoveText.set(null);
    this.currentFen.set('');
    this.expectedMove.set(undefined);
    this.feedback.set(null);
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
