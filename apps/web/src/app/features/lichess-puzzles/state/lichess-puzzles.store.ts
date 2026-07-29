import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  LichessPuzzleDifficulty,
  LichessPuzzleRound,
} from '@chess-trainer/contracts/lichess-puzzles';
import { LichessPuzzlesApiService } from '../data-access/lichess-puzzles-api.service';

const DIFFICULTIES: readonly LichessPuzzleDifficulty[] = [
  'easiest',
  'easier',
  'normal',
  'harder',
  'hardest',
];

@Injectable()
export class LichessPuzzlesStore {
  private readonly api = inject(LichessPuzzlesApiService);

  private readonly difficultyState = signal<LichessPuzzleDifficulty>('normal');
  private readonly ratedState = signal(true);
  private readonly roundState = signal<LichessPuzzleRound | null>(null);
  private readonly lastMoveUciState = signal<string | null>(null);
  private readonly positionVersionState = signal(0);
  private readonly loadingState = signal(false);
  private readonly submittingState = signal(false);
  private readonly abandoningState = signal(false);
  private readonly syncingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly errorCodeState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);

  readonly difficulty = this.difficultyState.asReadonly();
  readonly rated = this.ratedState.asReadonly();
  readonly round = this.roundState.asReadonly();
  readonly positionVersion = this.positionVersionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly abandoning = this.abandoningState.asReadonly();
  readonly syncing = this.syncingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly errorCode = this.errorCodeState.asReadonly();
  readonly notice = this.noticeState.asReadonly();

  readonly busy = computed(
    () => this.loading() || this.submitting() || this.abandoning() || this.syncing(),
  );
  readonly boardMovable = computed(
    () => this.round()?.status === 'IN_PROGRESS' && !this.busy(),
  );
  readonly lastMove = computed(() => {
    const move = this.lastMoveUciState();
    if (!move || move.length < 4) return null;
    return { from: move.slice(0, 2), to: move.slice(2, 4) };
  });
  readonly requiresReconnect = computed(
    () => this.errorCode() === 'LICHESS_NOT_CONNECTED'
      || this.errorCode() === 'LICHESS_SCOPE_MISSING'
      || this.errorCode() === 'LICHESS_TOKEN_EXPIRED',
  );
  readonly canRetrySync = computed(
    () => this.round()?.upstreamStatus === 'FAILED' && !this.busy(),
  );

  setDifficulty(value: string): void {
    if (DIFFICULTIES.includes(value as LichessPuzzleDifficulty)) {
      this.difficultyState.set(value as LichessPuzzleDifficulty);
    }
  }

  setRated(value: boolean): void {
    this.ratedState.set(value);
  }

  async loadRound(roundId: number): Promise<boolean> {
    if (this.loading()) return false;
    this.loadingState.set(true);
    this.clearMessages();
    try {
      const round = await firstValueFrom(this.api.getRound(roundId));
      this.applyRound(round, round.puzzle.lastMoveUci);
      this.difficultyState.set(round.difficulty ?? 'normal');
      this.ratedState.set(round.ratedRequested);
      this.noticeState.set(
        round.status === 'IN_PROGRESS'
          ? 'Puzzle round restored.'
          : 'Completed puzzle round loaded.',
      );
      return true;
    } catch (error) {
      this.setError(error, 'Could not load the Lichess puzzle round.');
      return false;
    } finally {
      this.loadingState.set(false);
    }
  }

  async startRound(): Promise<number | null> {
    if (this.loading()) return null;
    this.loadingState.set(true);
    this.clearMessages();
    try {
      const round = await firstValueFrom(this.api.createRound({
        source: 'FRESH',
        angle: 'mix',
        difficulty: this.difficulty(),
        rated: this.rated(),
      }));
      this.applyRound(round, round.puzzle.lastMoveUci);
      this.noticeState.set(
        round.ratedRequested
          ? 'Rated Lichess puzzle started.'
          : 'Practice puzzle started. This round will not change your Lichess rating.',
      );
      return round.id;
    } catch (error) {
      this.setError(error, 'Could not start a Lichess puzzle.');
      return null;
    } finally {
      this.loadingState.set(false);
    }
  }

  async submitMove(moveUci: string): Promise<void> {
    const round = this.round();
    if (!round || !this.boardMovable()) return;
    this.submittingState.set(true);
    this.clearMessages();
    try {
      const result = await firstValueFrom(this.api.submitMove(round.id, moveUci));
      this.applyRound(
        result.round,
        result.correct ? (result.forcedMoveUci ?? moveUci) : this.lastMoveUciState(),
      );
      if (!result.correct) {
        this.noticeState.set(
          result.round.ratedRequested
            ? 'Incorrect. The rated result is a loss, but you can continue and complete the line.'
            : 'Incorrect. Try again from the same position.',
        );
      } else if (result.round.status === 'COMPLETED') {
        this.noticeState.set(
          result.round.outcome === 'WIN'
            ? 'Solved first try.'
            : 'Line completed after an earlier mistake.',
        );
      } else {
        this.noticeState.set('Correct. The opponent replied; your move again.');
      }
    } catch (error) {
      this.positionVersionState.update((version) => version + 1);
      this.setError(error, 'Could not submit that puzzle move.');
    } finally {
      this.submittingState.set(false);
    }
  }

  async abandonRound(): Promise<void> {
    const round = this.round();
    if (!round || round.status !== 'IN_PROGRESS' || this.abandoning()) return;
    this.abandoningState.set(true);
    this.clearMessages();
    try {
      this.applyRound(await firstValueFrom(this.api.abandonRound(round.id)), this.lastMoveUciState());
      this.noticeState.set('Puzzle round abandoned.');
    } catch (error) {
      this.setError(error, 'Could not abandon the puzzle round.');
    } finally {
      this.abandoningState.set(false);
    }
  }

  async retrySync(): Promise<void> {
    const round = this.round();
    if (!round || !this.canRetrySync()) return;
    this.syncingState.set(true);
    this.clearMessages();
    try {
      this.applyRound(await firstValueFrom(this.api.retrySync(round.id)), this.lastMoveUciState());
      this.noticeState.set(
        this.round()?.upstreamStatus === 'SYNCED'
          ? 'Lichess result synchronized.'
          : 'The result is still waiting to synchronize.',
      );
    } catch (error) {
      this.setError(error, 'Could not retry Lichess synchronization.');
    } finally {
      this.syncingState.set(false);
    }
  }

  private applyRound(round: LichessPuzzleRound, lastMoveUci: string | null): void {
    this.roundState.set(round);
    this.lastMoveUciState.set(lastMoveUci);
    this.positionVersionState.update((version) => version + 1);
  }

  private clearMessages(): void {
    this.errorState.set(null);
    this.errorCodeState.set(null);
    this.noticeState.set(null);
  }

  private setError(error: unknown, fallback: string): void {
    const response = error as HttpErrorResponse & {
      error?: { error?: string; code?: string };
    };
    this.errorState.set(response.error?.error || response.message || fallback);
    this.errorCodeState.set(response.error?.code || null);
  }
}
