import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AiBuilderCompletionSummaryResponse } from '@chess-trainer/contracts/ai';
import type {
  BuilderCourseDraft,
  BuilderCourseReintegrationApplyResponse,
  BuilderCourseReintegrationPreviewResponse,
  BuilderCourseReintegrationTarget,
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

const existingTarget: BuilderCourseReintegrationTarget = {
  kind: 'EXISTING_LINE',
  lineId: 9,
  anchor: { kind: 'LINE_START', nodeId: null, normalizedFen: 'normalized-start' },
};

const applyResult: BuilderCourseReintegrationApplyResponse = {
  contractVersion: '2026-07-v1',
  targetKind: 'NEW_LINE',
  courseId: 1,
  chapterId: 2,
  lineId: 10,
  lineName: 'Reviewed line',
  createdMoves: 3,
  reusedMoves: 0,
  skippedBranches: 1,
  conflictingMoves: 0,
  totalDraftMoves: 3,
  courseContentRevision: 5,
  idempotent: false,
};

const completionSummary = {
  authoritativeResult: {
    factualSummary: 'Reviewed line in Course · Chapter was updated with 3 created moves.',
  },
  interpretation: {
    interpretation: 'The supplied result contains one applied repertoire slice.',
    highlights: [],
    studyChecklist: [{ text: 'Review the supplied applied path.' }],
    unresolvedWorkNote: null,
    warning: null,
  },
  referencedFacts: [],
  disclaimer: 'Course changes are authoritative; generated study suggestions are optional.',
} as unknown as AiBuilderCompletionSummaryResponse;

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

    expect(emitted).toEqual([existingTarget]);
  });

  it('disables every destination except the source Course ending endpoint', () => {
    fixture.componentRef.setInput('destinationLocked', true);
    fixture.componentRef.setInput('requiredTarget', existingTarget);
    fixture.componentRef.setInput('selectedTarget', existingTarget);
    fixture.detectChanges();

    const targetButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.target-card') as NodeListOf<HTMLButtonElement>,
    );
    const newLineButton = targetButtons.find((button) => button.textContent?.includes('New line'));
    const existingButton = targetButtons.find((button) => button.textContent?.includes('Existing line'));

    expect(fixture.nativeElement.textContent).toContain('exact source line endpoint');
    expect(newLineButton?.disabled).toBeTrue();
    expect(existingButton?.disabled).toBeFalse();
    expect((fixture.nativeElement.querySelector('select[formControlName="courseId"]') as HTMLSelectElement).disabled)
      .toBeTrue();
  });

  it('never exposes or requests a completion summary before apply succeeds', () => {
    fixture.componentRef.setInput('completionSummaryAvailable', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.completion-summary')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Generate study summary');
  });

  it('exposes one explicit summary request only after the authoritative result exists', () => {
    fixture.componentRef.setInput('completionSummaryAvailable', true);
    fixture.componentRef.setInput('result', applyResult);
    fixture.detectChanges();

    const emitted: void[] = [];
    fixture.componentInstance.completionSummaryRequested.subscribe(() => emitted.push(undefined));
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('.completion-summary button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes('Generate study summary'));
    button?.click();

    expect(fixture.nativeElement.textContent).toContain('Course updated');
    expect(button).toBeDefined();
    expect(emitted.length).toBe(1);
  });

  it('keeps the verified result before generated interpretation', () => {
    fixture.componentRef.setInput('completionSummaryAvailable', true);
    fixture.componentRef.setInput('result', applyResult);
    fixture.componentRef.setInput('completionSummary', completionSummary);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Verified result');
    expect(text).toContain('Generated interpretation');
    expect(text.indexOf('Verified result')).toBeLessThan(text.indexOf('Generated interpretation'));
    expect(text).toContain('Course changes are authoritative');
  });
});