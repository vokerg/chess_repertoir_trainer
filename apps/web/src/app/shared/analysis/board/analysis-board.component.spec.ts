import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chess } from 'chess.js';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../chess/board/chessground-board.component';
import { AnalysisBoardComponent } from './analysis-board.component';

describe('AnalysisBoardComponent', () => {
  let fixture: ComponentFixture<AnalysisBoardComponent>;
  let fen: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisBoardComponent);
    fen = new Chess().fen();
    fixture.componentRef.setInput('currentFen', fen);
    fixture.componentRef.setInput('side', 'WHITE');
    fixture.componentRef.setInput('blackPerspective', false);
    fixture.componentRef.setInput('analysis', {
      fen,
      running: false,
      ready: true,
      error: null,
      bestMove: 'e2e4',
      lines: [],
    });
  });

  it('renders the board and navigation toolbar', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(ChessgroundBoardComponent))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(BoardActionToolbarComponent))).not.toBeNull();
  });

  it('renders the eval bar, engine arrow, and Stockfish when the engine is visible', () => {
    fixture.componentRef.setInput('arrows', [{ from: 'a2', to: 'a4', brush: 'blue' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-engine-eval-bar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-stockfish-panel')).not.toBeNull();
    expect(fixture.componentInstance.boardArrows()).toEqual([
      { from: 'a2', to: 'a4', brush: 'blue' },
      { from: 'e2', to: 'e4', brush: 'green' },
    ]);
  });

  it('hides all engine UI while preserving caller-provided arrows', () => {
    const callerArrow = { from: 'a2', to: 'a4', brush: 'blue' };
    fixture.componentRef.setInput('arrows', [callerArrow]);
    fixture.componentRef.setInput('engineVisible', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-engine-eval-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-stockfish-panel')).toBeNull();
    expect(fixture.componentInstance.boardArrows()).toEqual([callerArrow]);
  });

  it('emits board and navigation events', () => {
    const boardMove = jasmine.createSpy('boardMove');
    const goStart = jasmine.createSpy('goStart');
    const goPrevious = jasmine.createSpy('goPrevious');
    const goNext = jasmine.createSpy('goNext');
    const goEnd = jasmine.createSpy('goEnd');
    const flipBoard = jasmine.createSpy('flipBoard');
    fixture.componentInstance.boardMove.subscribe(boardMove);
    fixture.componentInstance.goStart.subscribe(goStart);
    fixture.componentInstance.goPrevious.subscribe(goPrevious);
    fixture.componentInstance.goNext.subscribe(goNext);
    fixture.componentInstance.goEnd.subscribe(goEnd);
    fixture.componentInstance.flipBoard.subscribe(flipBoard);
    fixture.detectChanges();

    const board = fixture.debugElement.query(By.directive(ChessgroundBoardComponent))
      .componentInstance as ChessgroundBoardComponent;
    const toolbar = fixture.debugElement.query(By.directive(BoardActionToolbarComponent))
      .componentInstance as BoardActionToolbarComponent;
    board.move.emit('e2e4');
    toolbar.goStart.emit();
    toolbar.goPrevious.emit();
    toolbar.goNext.emit();
    toolbar.goEnd.emit();
    toolbar.flip.emit();

    expect(boardMove).toHaveBeenCalledOnceWith('e2e4');
    expect(goStart).toHaveBeenCalled();
    expect(goPrevious).toHaveBeenCalled();
    expect(goNext).toHaveBeenCalled();
    expect(goEnd).toHaveBeenCalled();
    expect(flipBoard).toHaveBeenCalled();
  });

  it('forwards optional navigation and flip visibility to the toolbar', () => {
    fixture.componentRef.setInput('showNextNavigation', false);
    fixture.componentRef.setInput('showEndNavigation', false);
    fixture.componentRef.setInput('showFlipBoard', true);
    fixture.detectChanges();

    const toolbar = fixture.debugElement.query(By.directive(BoardActionToolbarComponent))
      .componentInstance as BoardActionToolbarComponent;
    expect(toolbar.showNext()).toBeFalse();
    expect(toolbar.showEnd()).toBeFalse();
    expect(toolbar.showFlip()).toBeTrue();
  });
});
