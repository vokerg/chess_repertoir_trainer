import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chess } from 'chess.js';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { AnalysisWorkbenchComponent } from './analysis-workbench.component';

describe('AnalysisWorkbenchComponent', () => {
  let fixture: ComponentFixture<AnalysisWorkbenchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisWorkbenchComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisWorkbenchComponent);
    const fen = new Chess().fen();
    fixture.componentRef.setInput('currentFen', fen);
    fixture.componentRef.setInput('side', 'WHITE');
    fixture.componentRef.setInput('blackPerspective', false);
    fixture.componentRef.setInput('boardTitle', 'Board');
    fixture.componentRef.setInput('treeTitle', 'Tree');
    fixture.componentRef.setInput('analysis', {
      fen,
      running: false,
      ready: true,
      error: null,
      bestMove: 'e2e4',
      lines: [],
    });
  });

  it('removes the engine panel, eval bar, best-move arrow, and eval grid column', () => {
    fixture.componentRef.setInput('engineVisible', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-engine-eval-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-stockfish-panel')).toBeNull();
    expect(fixture.componentInstance.boardArrows()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.board-stage').classList).toContain(
      'board-stage-engine-hidden',
    );
  });

  it('can hide the move tree for workbench consumers with their own side widgets', () => {
    fixture.componentRef.setInput('showTreePanel', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-move-tree-panel')).toBeNull();
  });

  it('forwards optional navigation visibility to the board toolbar', () => {
    fixture.componentRef.setInput('showNextNavigation', false);
    fixture.componentRef.setInput('showEndNavigation', false);
    fixture.detectChanges();

    const toolbar = fixture.debugElement.query(By.directive(BoardActionToolbarComponent))
      .componentInstance as BoardActionToolbarComponent;
    expect(toolbar.showNext()).toBeFalse();
    expect(toolbar.showEnd()).toBeFalse();
  });
});
