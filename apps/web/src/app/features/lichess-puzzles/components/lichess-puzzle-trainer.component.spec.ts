import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BoardActionToolbarComponent } from '../../../shared/chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import type { LichessPuzzleTrainerViewModel } from '../helpers/lichess-puzzle-trainer-view-model';
import { LichessPuzzleTrainerComponent } from './lichess-puzzle-trainer.component';

describe('LichessPuzzleTrainerComponent', () => {
  it('automatically replays the trigger move and reviews it with shared controls', fakeAsync(() => {
    const fixture = TestBed.configureTestingModule({
      imports: [LichessPuzzleTrainerComponent],
    }).createComponent(LichessPuzzleTrainerComponent);
    fixture.componentRef.setInput('view', createView());
    fixture.detectChanges();

    const board = fixture.debugElement.query(By.directive(ChessgroundBoardComponent))
      .componentInstance as ChessgroundBoardComponent;
    const replayLastMove = spyOn(board, 'replayLastMove');

    tick();
    expect(replayLastMove).toHaveBeenCalledTimes(1);

    const showPrevious = spyOn(board, 'showPositionBeforeLastMove').and.returnValue(true);
    const showCurrent = spyOn(board, 'showCurrentPosition').and.returnValue(true);
    const toolbar = fixture.debugElement.query(By.directive(BoardActionToolbarComponent))
      .componentInstance as BoardActionToolbarComponent;

    toolbar.goPrevious.emit();
    fixture.detectChanges();
    expect(showPrevious).toHaveBeenCalled();
    expect(toolbar.canGoBackward()).toBeFalse();
    expect(toolbar.canGoForward()).toBeTrue();

    toolbar.goNext.emit();
    fixture.detectChanges();
    expect(showCurrent).toHaveBeenCalled();
    expect(toolbar.canGoBackward()).toBeTrue();
    expect(toolbar.canGoForward()).toBeFalse();
  }));

  it('supports arrow-key review and shows persisted incorrect feedback', fakeAsync(() => {
    const fixture = TestBed.configureTestingModule({
      imports: [LichessPuzzleTrainerComponent],
    }).createComponent(LichessPuzzleTrainerComponent);
    fixture.componentRef.setInput('view', createView({
      mistakeFeedback: 'Incorrect move. Lichess recorded this rated puzzle as a loss.',
    }));
    fixture.detectChanges();
    tick();

    const board = fixture.debugElement.query(By.directive(ChessgroundBoardComponent))
      .componentInstance as ChessgroundBoardComponent;
    const showPrevious = spyOn(board, 'showPositionBeforeLastMove').and.returnValue(true);
    const showCurrent = spyOn(board, 'showCurrentPosition').and.returnValue(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(showPrevious).toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(showCurrent).toHaveBeenCalled();

    const feedback = fixture.debugElement.query(By.css('.puzzle-feedback.incorrect'));
    expect(feedback.nativeElement.textContent).toContain('Incorrect move');
  }));
});

function createView(
  overrides: Partial<LichessPuzzleTrainerViewModel> = {},
): LichessPuzzleTrainerViewModel {
  return {
    roundId: 42,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2',
    side: 'WHITE',
    lastMove: { from: 'e7', to: 'e5' },
    puzzleRating: 1500,
    progressLabel: '0 / 3 solution plies',
    modeLabel: 'Rated',
    syncLabel: 'Awaiting result',
    outcomeLabel: 'Your move',
    ratingLabel: 'Rated on Lichess',
    themes: [],
    guidance: 'Find the best continuation.',
    mistakeFeedback: null,
    canAbandon: true,
    canStartNext: false,
    canRetrySync: false,
    ...overrides,
  };
}
