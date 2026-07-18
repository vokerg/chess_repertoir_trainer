import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisTree } from '../workbench/analysis-tree.models';
import { MoveTreePanelComponent } from './move-tree-panel.component';

@Component({
  standalone: true,
  imports: [MoveTreePanelComponent],
  template: `
    <app-move-tree-panel
      [tree]="tree"
      [selectedNodeId]="selectedNodeId()"
      title="Move tree"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class MoveTreePanelTestHostComponent {
  readonly selectedNodeId = signal(0);
  readonly tree: AnalysisTree = {
    root: {
      node: { id: 0, moveSan: null, moveUci: null, isUserMove: false },
      children: [
        {
          node: { id: 1, moveSan: 'e4', moveUci: 'e2e4', isUserMove: true },
          children: [
            {
              node: { id: 2, moveSan: 'e5', moveUci: 'e7e5', isUserMove: false },
              children: [],
            },
          ],
        },
      ],
    },
  };
}

describe('MoveTreePanelComponent', () => {
  let fixture: ComponentFixture<MoveTreePanelTestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveTreePanelTestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MoveTreePanelTestHostComponent);
  });

  it('shows the mainline copy button when the root node is selected', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('app-copy-button button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.textContent?.trim()).toBe('Copy line');
  });
});
