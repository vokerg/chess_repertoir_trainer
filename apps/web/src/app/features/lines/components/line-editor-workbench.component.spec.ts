import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis/workbench/analysis-workbench.component';
import { defaultOpeningFilters } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { LineEditorWorkbenchComponent } from './line-editor-workbench.component';
import { LineNotesEditorComponent } from './line-notes-editor.component';

describe('LineEditorWorkbenchComponent widget visibility', () => {
  it('hides notes without losing an unsaved draft and suppresses engine arrows and warnings', async () => {
    await TestBed.configureTestingModule({ imports: [LineEditorWorkbenchComponent] })
      .overrideComponent(AnalysisWorkbenchComponent, {
        set: { template: '<ng-content />', imports: [] },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(LineEditorWorkbenchComponent);
    for (const [name, value] of Object.entries({
      tree: { root: { node: { id: 0 }, children: [] } },
      selectedNodeId: 1,
      nodeId: 1,
      currentFen: 'startpos',
      side: 'WHITE',
      blackPerspective: false,
      analysis: { fen: 'startpos', lines: [] },
      gamesFilters: defaultOpeningFilters(),
      gamesVisible: false,
      evidenceVisible: false,
      arrows: [{ from: 'e2', to: 'e4' }],
      engineWarning: 'Engine prefers e4',
    }))
      fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    const notesElement = fixture.debugElement.query(By.directive(LineNotesEditorComponent));
    const notes = notesElement.componentInstance as LineNotesEditorComponent;
    notes.comment = 'Unsaved explanation';

    fixture.componentRef.setInput('notesVisible', false);
    fixture.componentRef.setInput('engineVisible', false);
    fixture.detectChanges();
    expect((notesElement.nativeElement as HTMLElement).style.display).toBe('none');
    const workbench = fixture.debugElement.query(By.directive(AnalysisWorkbenchComponent))
      .componentInstance as AnalysisWorkbenchComponent;
    expect(workbench.arrows()).toEqual([]);
    expect(workbench.engineWarning()).toBeNull();

    fixture.componentRef.setInput('notesVisible', true);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.directive(LineNotesEditorComponent)).componentInstance,
    ).toBe(notes);
    expect(notes.comment).toBe('Unsaved explanation');
    expect((notesElement.nativeElement as HTMLElement).hidden).toBeFalse();
  });
});
