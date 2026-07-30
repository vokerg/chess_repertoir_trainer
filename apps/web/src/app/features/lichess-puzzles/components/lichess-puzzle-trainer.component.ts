import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { BoardActionToolbarComponent } from '../../../shared/chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { FactGridComponent, UiFactItem } from '../../../shared/ui/fact-grid/fact-grid.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { LichessPuzzleTrainerViewModel } from '../helpers/lichess-puzzle-trainer-view-model';

@Component({
  selector: 'app-lichess-puzzle-trainer',
  standalone: true,
  imports: [BoardActionToolbarComponent, ChessgroundBoardComponent, FactGridComponent, PanelComponent],
  templateUrl: './lichess-puzzle-trainer.component.html',
  styleUrl: './lichess-puzzle-trainer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessPuzzleTrainerComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly view = input.required<LichessPuzzleTrainerViewModel>();
  readonly movable = input(false);
  readonly positionVersion = input(0);
  readonly busy = input(false);

  @ViewChild(ChessgroundBoardComponent) private board?: ChessgroundBoardComponent;

  readonly boardMove = output<string>();
  readonly abandon = output<void>();
  readonly retrySync = output<void>();
  readonly nextPuzzle = output<void>();

  protected readonly reviewingPreviousMove = signal(false);
  protected readonly facts = computed<readonly UiFactItem[]>(() => [
    { id: 'rating', label: 'Puzzle rating', value: this.view().puzzleRating, mono: true },
    { id: 'progress', label: 'Progress', value: this.view().progressLabel, mono: true },
    { id: 'mode', label: 'Mode', value: this.view().modeLabel },
    { id: 'sync', label: 'Sync', value: this.view().syncLabel },
  ]);
  private replayTimer: ReturnType<typeof setTimeout> | null = null;
  private renderedRoundId: number | null = null;

  ngAfterViewInit(): void {
    this.renderedRoundId = this.view().roundId;
    this.schedulePreviousMoveReplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['view'] || !this.board) return;
    const roundId = this.view().roundId;
    if (roundId === this.renderedRoundId) return;
    this.renderedRoundId = roundId;
    this.schedulePreviousMoveReplay();
  }

  ngOnDestroy(): void {
    this.cancelScheduledReplay();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (
      this.busy()
      || tag === 'input'
      || tag === 'textarea'
      || tag === 'select'
      || target?.isContentEditable
    ) {
      return;
    }

    const command = event.key === 'ArrowLeft'
      ? () => this.goToPreviousMove()
      : event.key === 'ArrowRight'
        ? () => this.goToPuzzlePosition()
        : null;
    if (!command) return;
    event.preventDefault();
    command();
  }

  protected goToPreviousMove(): void {
    if (this.busy() || this.reviewingPreviousMove()) return;
    this.cancelScheduledReplay();
    if (this.board?.showPositionBeforeLastMove()) this.reviewingPreviousMove.set(true);
  }

  protected goToPuzzlePosition(): void {
    if (this.busy() || !this.reviewingPreviousMove()) return;
    if (this.board?.showCurrentPosition()) this.reviewingPreviousMove.set(false);
  }

  private schedulePreviousMoveReplay(): void {
    this.cancelScheduledReplay();
    this.reviewingPreviousMove.set(false);
    this.replayTimer = setTimeout(() => {
      this.replayTimer = null;
      this.board?.replayLastMove();
    });
  }

  private cancelScheduledReplay(): void {
    if (this.replayTimer === null) return;
    clearTimeout(this.replayTimer);
    this.replayTimer = null;
  }
}