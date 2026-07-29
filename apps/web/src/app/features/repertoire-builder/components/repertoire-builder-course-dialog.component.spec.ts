import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  BuilderCourseDraft,
  BuilderCourseReintegrationPreviewResponse,
} from '@chess-trainer/contracts/courses';
import { RepertoireBuilderCourseDialogComponent } from './repertoire-builder-course-dialog.component';

const draft = {
  materializedMoveCount: 3,
  materializedDecisionCount: 2,
  excludedBranches: [{ branchId: 'deferred' }],
  transpositionLeafCount: 1,
} as unknown as BuilderCourseDraft;

const preview: BuilderCourseReintegrationPreviewResponse = {
  contractVersion: '2026-07-v1',
  previewToken: `sha256:${'a'.repeat(64)}`,
  previewedAt: '2026-07-29T12:00:00.000Z',
  course: { id: 1, name: 'Course', contentRevision: 4 },
  chapter: { id: 2, name: 'Chapter' },
  draft: {
    sessionId: 'session', sessionRevision: 3, targetId: 'target', targetRevision: 1,
    repertoireSide: 'WHITE', materializedDecisionCount: 2, materializedMoveCount: 3,
    transpositionLeafCount: 1, excludedBranches: [],
  },
  candidates: [{
    lineId: 9,
    lineName: 'Existing line',
    sideToTrain: 'WHITE',
    anchor: {
      kind: 'LINE_START', lineId: 9, lineName: 'Existing line', nodeId: null,
      fen: 'startpos', normalizedFen: 'normalized-start', moveSequenceSan: null,
    },
    counts: { reusedMoves: 1, createdMoves: 2, conflictingMoves: 0, totalDraftMoves: 3, skippedBranches: 1 },
    conflicts: [], warnings: [], previewTree: [],
  }],
  newLine: {
    status: 'CREATES', allowed: true, equivalentLine: null,
    counts: { reusedMoves: 0, createdMoves: 3, conflictingMoves: 0, totalDraftMoves: 3, skippedBranches: 1 },
    conflicts: [], warnings: ['One transposition path remains terminal.'], previewTree: [],
  },
};

describe('RepertoireBuilderCourseDialogComponent', () => {
  let fixture: ComponentFixture<RepertoireBuilderCourseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepertoireBuilderCourseDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RepertoireBuilderCourseDialogComponent);
    fixture.componentRef.setInput('courses', [{ id: 1, name: 'Course' }]);
    fixture.componentRef.setInput('chapters', [{ id: 2, courseId: 1, name: 'Chapter', sortOrder: 0 }]);
    fixture.componentRef.setInput('selectedCourseId', 1);
    fixture.componentRef.setInput('selectedChapterId', 2);
    fixture.componentRef.setInput('newLineName', 'Reviewed line');
    fixture.componentRef.setInput('draft', draft);
    fixture.componentRef.setInput('preview', preview);
    fixture.componentRef.setInput('selectedTarget', { kind: 'NEW_LINE', name: 'Reviewed line' });
    fixture.componentRef.setInput('canPreview', true);
    fixture.componentRef.setInput('canApply', true);
    fixture.detectChanges();
  });

  it('renders mandatory preview counts and emits an explicit apply intent', () => {
    expect(fixture.nativeElement.textContent).toContain('Review this draft before writing');
    expect(fixture.nativeElement.textContent).toContain('3 create');
    expect(fixture.nativeElement.textContent).toContain('Existing line');
    expect(fixture.nativeElement.textContent).toContain('1');

    const applyButton = fixture.nativeElement.querySelector(
      '.course-actions .primary-button',
    ) as HTMLButtonElement | null;
    expect(applyButton).not.toBeNull();
    expect(applyButton?.disabled).toBeFalse();

    const emitted: void[] = [];
    fixture.componentInstance.applyRequested.subscribe(() => emitted.push(undefined));
    applyButton?.click();

    expect(emitted.length).toBe(1);
  });

  it('emits the exact reviewed existing-line target', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.targetSelected.subscribe((target) => emitted.push(target));
    const existingButton = Array.from(
      fixture.nativeElement.querySelectorAll('.target-card') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Existing line'));
    existingButton?.click();

    expect(emitted).toEqual([{
      kind: 'EXISTING_LINE',
      lineId: 9,
      anchor: { kind: 'LINE_START', nodeId: null, normalizedFen: 'normalized-start' },
    }]);
  });
});
