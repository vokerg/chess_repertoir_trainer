import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chess } from 'chess.js';
import { AnalysisBoardComponent } from '../board/analysis-board.component';
import { MoveTreePanelComponent } from '../move-tree-panel/move-tree-panel.component';
import { AnalysisWorkbenchComponent } from './analysis-workbench.component';

@Component({
  standalone: true,
  imports: [AnalysisWorkbenchComponent],
  template: `
    <app-analysis-workbench
      [currentFen]="fen"
      side="WHITE"
      [blackPerspective]="false"
      [analysis]="analysis"
      [showTreePanel]="showTreePanel()"
      [deleteDisabled]="deleteDisabled()"
    >
      <div analysisWorkbenchLeftExtra data-testid="left-extra">Left extra</div>
      <div analysisWorkbenchSideBeforeTree data-testid="side-before">Side before</div>
      <div analysisWorkbenchSideExtra data-testid="side-extra">Side extra</div>
    </app-analysis-workbench>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AnalysisWorkbenchTestHostComponent {
  readonly fen = new Chess().fen();
  readonly analysis = {
    fen: this.fen,
    running: false,
    ready: true,
    error: null,
    bestMove: 'e2e4',
    lines: [],
  };
  readonly showTreePanel = signal(true);
  readonly deleteDisabled = signal(false);
}

describe('AnalysisWorkbenchComponent', () => {
  let fixture: ComponentFixture<AnalysisWorkbenchTestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisWorkbenchTestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisWorkbenchTestHostComponent);
  });

  it('renders AnalysisBoardComponent as its main board composition', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(AnalysisBoardComponent))).not.toBeNull();
  });

  it('renders or hides the move tree', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-move-tree-panel')).not.toBeNull();

    fixture.componentInstance.showTreePanel.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-move-tree-panel')).toBeNull();
  });

  it('preserves projected content ordering around the board and move tree', () => {
    fixture.detectChanges();

    const mainChildren = Array.from(
      fixture.nativeElement.querySelector('.workbench-main-stack').children,
    ) as HTMLElement[];
    const sideChildren = Array.from(
      fixture.nativeElement.querySelector('.workbench-side-stack').children,
    ) as HTMLElement[];

    expect(mainChildren.map((element) => element.tagName)).toEqual([
      'APP-PANEL',
      'DIV',
    ]);
    expect(mainChildren[0].querySelector('app-analysis-board')).not.toBeNull();
    expect(mainChildren[1].dataset['testid']).toBe('left-extra');
    expect(sideChildren.map((element) => element.dataset['testid'] || element.tagName)).toEqual([
      'side-before',
      'APP-MOVE-TREE-PANEL',
      'side-extra',
    ]);
  });

  it('forwards deletion disabled state to the move tree', () => {
    fixture.componentInstance.deleteDisabled.set(true);
    fixture.detectChanges();

    const moveTreePanel = fixture.debugElement.query(By.directive(MoveTreePanelComponent))
      .componentInstance as MoveTreePanelComponent;
    expect(moveTreePanel.deletionDisabled()).toBeTrue();
  });
});
