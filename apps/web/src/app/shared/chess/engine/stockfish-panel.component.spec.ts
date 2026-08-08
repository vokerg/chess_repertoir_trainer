import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chess } from 'chess.js';
import { StockfishPanelComponent } from './stockfish-panel.component';

describe('StockfishPanelComponent', () => {
  let fixture: ComponentFixture<StockfishPanelComponent>;
  let fen: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockfishPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockfishPanelComponent);
    fen = new Chess().fen();
    fixture.componentRef.setInput('currentFen', fen);
    fixture.componentRef.setInput('analysis', analysisFor(fen, ['e2e4', 'e7e5']));
  });

  it('keeps engine rows non-interactive by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button.stockfish-line-slot')).toBeNull();
    expect(fixture.nativeElement.querySelector('div.stockfish-line-slot')).not.toBeNull();
  });

  it('emits the normalized first UCI move when an opt-in row is selected', () => {
    const moveSelected = jasmine.createSpy('moveSelected');
    fixture.componentInstance.moveSelected.subscribe(moveSelected);
    fixture.componentRef.setInput('analysis', analysisFor(fen, ['E2E4', 'e7e5']));
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector(
      'button.stockfish-line-slot',
    ) as HTMLButtonElement;
    row.click();

    expect(moveSelected).toHaveBeenCalledOnceWith('e2e4');
  });

  it('does not make a row selectable when its first move is not valid UCI', () => {
    fixture.componentRef.setInput('analysis', analysisFor(fen, ['not-a-move']));
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button.stockfish-line-slot')).toBeNull();
    expect(fixture.nativeElement.querySelector('div.stockfish-line-slot')).not.toBeNull();
  });
});

function analysisFor(fen: string, pv: string[]) {
  return {
    fen,
    running: false,
    ready: true,
    error: null,
    bestMove: pv[0] ?? null,
    lines: [{ multipv: 1, depth: 18, scoreCp: 30, pv }],
  };
}
