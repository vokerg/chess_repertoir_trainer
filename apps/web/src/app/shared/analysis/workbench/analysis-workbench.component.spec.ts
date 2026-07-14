import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chess } from 'chess.js';
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
});
