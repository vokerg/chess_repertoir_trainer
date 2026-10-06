import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisTree } from '../workbench/analysis-tree.models';
import { MoveTreeComponent } from './move-tree.component';

const tree: AnalysisTree = {
  root: {
    node: { id: 0, moveSan: null, moveUci: null, isUserMove: false },
    children: [{
      node: { id: 1, moveSan: 'd4', moveUci: 'd2d4', moveNumber: 1, side: 'WHITE', isUserMove: true, evalCpWhite: 30, source: 'GAME' },
      children: [
        {
          node: { id: 2, moveSan: 'd5', moveUci: 'd7d5', moveNumber: 1, side: 'BLACK', isUserMove: false, classification: 'BLUNDER', source: 'GAME' },
          children: [],
        },
        {
          node: { id: 3, moveSan: 'Nf6', moveUci: 'g8f6', moveNumber: 1, side: 'BLACK', isUserMove: false, source: 'LOCAL' },
          children: [{
            node: { id: 4, moveSan: 'c4', moveUci: 'c2c4', moveNumber: 2, side: 'WHITE', isUserMove: true },
            children: [],
          }],
        },
      ],
    }],
  },
};

describe('MoveTreeComponent presentations', () => {
  let fixture: ComponentFixture<MoveTreeComponent>;

  beforeEach(async () => {
    localStorage.removeItem('chess-trainer.move-tree-view');
    localStorage.removeItem('chess-trainer.move-tree-view.analysis');
    localStorage.removeItem('chess-trainer.move-tree-view.explore');
    localStorage.removeItem('chess-trainer.move-tree-view.repertoire');
    localStorage.removeItem('chess-trainer.move-tree-view.focused');
    await TestBed.configureTestingModule({ imports: [MoveTreeComponent] }).compileComponents();
    fixture = TestBed.createComponent(MoveTreeComponent);
    fixture.componentRef.setInput('tree', tree);
    fixture.componentRef.setInput('selectedNodeId', 2);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('chess-trainer.move-tree-view');
    localStorage.removeItem('chess-trainer.move-tree-view.analysis');
    localStorage.removeItem('chess-trainer.move-tree-view.explore');
    localStorage.removeItem('chess-trainer.move-tree-view.repertoire');
    localStorage.removeItem('chess-trainer.move-tree-view.focused');
  });

  it('keeps the existing tree as the default and switches without changing selected data', () => {
    expect(fixture.nativeElement.querySelector('.move-tree-modern')).not.toBeNull();
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-sheet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.move-score-move.selected')?.textContent).toContain('d5');
    expect(localStorage.getItem('chess-trainer.move-tree-view.explore')).toBe('score');
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-tree-modern')).not.toBeNull();
  });

  it('pairs moves, keeps grades and evals, and renders an expandable inline fork', () => {
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.move-score-row') as NodeListOf<HTMLElement>;
    expect(rows[0].textContent).toContain('d4');
    expect(rows[0].textContent).toContain('d5');
    expect(rows[0].textContent).toContain('+0.3');
    expect(rows[0].textContent).toContain('??');
    expect(fixture.nativeElement.querySelector('.move-score-branch-header')?.textContent).not.toContain('Branch from');
    expect(fixture.nativeElement.querySelector('.move-score-disclosure')?.getAttribute('aria-label')).toContain('variation from d4');
    expect(fixture.nativeElement.querySelector('.move-score-line-branch')?.textContent).toContain('Nf6');
    expect(fixture.nativeElement.querySelector('.move-score-line-branch')?.textContent).not.toContain('Local line');
    (fixture.nativeElement.querySelector('.move-score-disclosure') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-line-branch .move-score-row')).toBeNull();
  });

  it('forwards move selection through the same output as the existing view', () => {
    const selected: number[] = [];
    fixture.componentInstance.nodeSelected.subscribe((id) => selected.push(id));
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const move = fixture.nativeElement.querySelector('.move-score-line-branch .move-score-move') as HTMLButtonElement;
    move.click();
    expect(selected).toEqual([3]);
  });

  it('offers deletion only for local game moves and forwards the existing command', () => {
    fixture.componentRef.setInput('deletionEnabled', true);
    const deleted: number[] = [];
    const selected: number[] = [];
    fixture.componentInstance.deleteSelectedSubtree.subscribe(() => deleted.push(1));
    fixture.componentInstance.nodeSelected.subscribe((id) => selected.push(id));
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.move-score-delete') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    buttons[0].click();
    expect(selected).toEqual([3]);
    expect(deleted).toEqual([1]);
  });

  it('shows the correct move number when a loaded position begins with Black', () => {
    fixture.componentRef.setInput('tree', {
      root: { node: { id: 0, moveSan: null, moveUci: null, isUserMove: false }, children: [{
        node: { id: 23, moveSan: 'Nf6', moveUci: 'g8f6', moveNumber: 23, side: 'BLACK', isUserMove: false },
        children: [],
      }] },
    } satisfies AnalysisTree);
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-number')?.textContent?.trim()).toBe('23…');
  });

  it('can show only the score sheet without a presentation switch', () => {
    fixture.componentRef.setInput('display', 'score');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-sheet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.move-tree-view-switch')).toBeNull();
    expect(fixture.nativeElement.querySelector('.move-tree-modern')).toBeNull();
  });

  it('keeps each switchable display preference separate from the fixed game score', () => {
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.componentRef.setInput('display', 'score');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-tree-view-switch')).toBeNull();

    fixture.componentRef.setInput('display', 'focused');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-focused-score')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.move-tree-view-switch button').length).toBe(3);

    fixture.componentRef.setInput('display', 'explore');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-sheet')).not.toBeNull();
  });

  it('uses the same move typography in focused and all-forks repertoire views', () => {
    fixture.componentRef.setInput('display', 'focused');
    fixture.detectChanges();
    const focusedMove = fixture.nativeElement.querySelector('.move-focused-score .move-score-move') as HTMLElement;
    const focusedSize = getComputedStyle(focusedMove).fontSize;
    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const allForksMove = fixture.nativeElement.querySelector('.move-score-sheet .move-score-move') as HTMLElement;
    expect(getComputedStyle(allForksMove).fontSize).toBe(focusedSize);
  });

  it('labels only the game move at the deviation and the start of the engine line', () => {
    fixture.componentRef.setInput('tree', {
      root: { node: { id: 0, moveSan: null, moveUci: null, isUserMove: false }, children: [{
        node: { id: 1, moveSan: 'e4', moveUci: 'e2e4', moveNumber: 1, side: 'WHITE', isUserMove: true, moveMeta: 'Game' },
        children: [
          { node: { id: 2, moveSan: 'e5', moveUci: 'e7e5', moveNumber: 1, side: 'BLACK', isUserMove: false, moveMeta: 'Training move' }, children: [{
            node: { id: 4, moveSan: 'Nf3', moveUci: 'g1f3', moveNumber: 2, side: 'WHITE', isUserMove: true, moveMeta: 'Engine line' }, children: [{
              node: { id: 5, moveSan: 'Nc6', moveUci: 'b8c6', moveNumber: 2, side: 'BLACK', isUserMove: false, moveMeta: 'Engine line' }, children: [],
            }],
          }] },
          { node: { id: 3, moveSan: 'c5', moveUci: 'c7c5', moveNumber: 1, side: 'BLACK', isUserMove: false, moveMeta: 'Game move' }, children: [] },
        ],
      }] },
    } satisfies AnalysisTree);
    fixture.componentRef.setInput('display', 'score');
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.move-score-sheet')?.textContent as string;
    expect(text.match(/Game move/g)?.length).toBe(1);
    expect(text.match(/Engine line/g)?.length).toBe(1);
    expect(text).not.toContain('e4 Game');
  });

  it('shows a complete selected repertoire line and lets another full line replace it at a fork', () => {
    fixture.componentRef.setInput('display', 'focused');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-focused-score')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).toContain('d5');
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).not.toContain('Nf6');

    const selected: number[] = [];
    fixture.componentInstance.nodeSelected.subscribe((id) => selected.push(id));
    (fixture.nativeElement.querySelector('.move-focused-fork-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const choices = fixture.nativeElement.querySelectorAll('.move-focused-choice') as NodeListOf<HTMLButtonElement>;
    expect(choices.length).toBe(2);
    expect(choices[1].textContent).toContain('1.d4');
    expect(choices[1].textContent).toContain('1…Nf6');
    expect(choices[1].textContent).toContain('2.c4');
    choices[1].click();
    expect(selected).toEqual([3]);
    fixture.componentRef.setInput('selectedNodeId', 3);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).toContain('Nf6');
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).toContain('c4');
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).not.toContain('d5');

    fixture.componentRef.setInput('preferredContinuations', new Map([[1, 3]]));
    fixture.componentRef.setInput('selectedNodeId', 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).toContain('Nf6');
    expect(fixture.nativeElement.querySelector('.move-focused-score')?.textContent).not.toContain('d5');

    (fixture.nativeElement.querySelectorAll('.move-tree-view-switch button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.move-score-line-branch')?.textContent).toContain('Nf6');
    expect(fixture.nativeElement.querySelector('.move-score-sheet')?.textContent).toContain('d5');
  });
});
