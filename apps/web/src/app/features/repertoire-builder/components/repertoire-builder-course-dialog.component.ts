import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { AiBuilderCompletionSummaryResponse } from '@chess-trainer/contracts/ai';
import type {
  BuilderCourseDraft,
  BuilderCourseReintegrationApplyResponse,
  BuilderCourseReintegrationPreviewResponse,
  BuilderCourseReintegrationTarget,
} from '@chess-trainer/contracts/courses';
import type {
  RepertoireBuilderChapterOption,
  RepertoireBuilderCourseOption,
} from '../data-access/repertoire-builder-api.service';

type BuilderCourseMergeCandidate = BuilderCourseReintegrationPreviewResponse['candidates'][number];

@Component({
  selector: 'app-repertoire-builder-course-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './repertoire-builder-course-dialog.component.html',
  styleUrls: [
    './repertoire-builder-course-dialog.component.css',
    './repertoire-builder-course-dialog-completion-summary.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderCourseDialogComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly courses = input<readonly RepertoireBuilderCourseOption[]>([]);
  readonly chapters = input<readonly RepertoireBuilderChapterOption[]>([]);
  readonly selectedCourseId = input<number | null>(null);
  readonly selectedChapterId = input<number | null>(null);
  readonly newLineName = input('');
  readonly draft = input<BuilderCourseDraft | null>(null);
  readonly preview = input<BuilderCourseReintegrationPreviewResponse | null>(null);
  readonly selectedTarget = input<BuilderCourseReintegrationTarget | null>(null);
  readonly requiredTarget = input<BuilderCourseReintegrationTarget | null>(null);
  readonly destinationLocked = input(false);
  readonly result = input<BuilderCourseReintegrationApplyResponse | null>(null);
  readonly destinationsLoading = input(false);
  readonly previewLoading = input(false);
  readonly applyLoading = input(false);
  readonly error = input<string | null>(null);
  readonly canPreview = input(false);
  readonly canApply = input(false);
  readonly completionSummaryAvailable = input(false);
  readonly completionSummaryLoading = input(false);
  readonly completionSummaryError = input<string | null>(null);
  readonly completionSummary = input<AiBuilderCompletionSummaryResponse | null>(null);

  readonly courseSelected = output<number | null>();
  readonly chapterSelected = output<number | null>();
  readonly newLineNameChanged = output<string>();
  readonly previewRequested = output<void>();
  readonly targetSelected = output<BuilderCourseReintegrationTarget>();
  readonly applyRequested = output<void>();
  readonly completionSummaryRequested = output<void>();
  readonly closed = output<void>();

  protected readonly form = new FormGroup({
    courseId: new FormControl<number | null>(null, Validators.required),
    chapterId: new FormControl<number | null>(null, Validators.required),
    newLineName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  constructor() {
    effect(() => {
      const courseId = this.selectedCourseId();
      const busy = this.destinationsLoading() || this.applyLoading();
      const fixedDestination = this.destinationLocked();
      this.form.setValue({
        courseId,
        chapterId: this.selectedChapterId(),
        newLineName: this.newLineName(),
      }, { emitEvent: false });
      syncDisabled(this.form.controls.courseId, busy || fixedDestination);
      syncDisabled(this.form.controls.chapterId, busy || fixedDestination || courseId === null);
      syncDisabled(this.form.controls.newLineName, this.applyLoading() || fixedDestination);
    });
    this.form.controls.courseId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((courseId) => this.courseSelected.emit(courseId));
    this.form.controls.chapterId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((chapterId) => this.chapterSelected.emit(chapterId));
    this.form.controls.newLineName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => this.newLineNameChanged.emit(name));
  }

  protected close(): void {
    if (!this.applyLoading()) this.closed.emit();
  }

  protected requestPreview(): void {
    if (this.form.invalid || !this.canPreview()) {
      this.form.markAllAsTouched();
      return;
    }
    this.previewRequested.emit();
  }

  protected selectNewLine(): void {
    const nextTarget: BuilderCourseReintegrationTarget = {
      kind: 'NEW_LINE',
      name: this.form.controls.newLineName.value.trim(),
    };
    if (this.isAllowed(nextTarget)) this.targetSelected.emit(nextTarget);
  }

  protected selectCandidate(candidate: BuilderCourseMergeCandidate): void {
    const nextTarget = targetFromCandidate(candidate);
    if (this.isAllowed(nextTarget)) this.targetSelected.emit(nextTarget);
  }

  protected isNewLineSelected(): boolean {
    return this.selectedTarget()?.kind === 'NEW_LINE';
  }

  protected isCandidateSelected(candidate: BuilderCourseMergeCandidate): boolean {
    const current = this.selectedTarget();
    return current !== null && sameTarget(current, targetFromCandidate(candidate));
  }

  protected isNewLineAllowed(): boolean {
    return this.isAllowed({
      kind: 'NEW_LINE',
      name: this.form.controls.newLineName.value.trim(),
    });
  }

  protected isCandidateAllowed(candidate: BuilderCourseMergeCandidate): boolean {
    return this.isAllowed(targetFromCandidate(candidate));
  }

  protected apply(): void {
    this.applyRequested.emit();
  }

  protected requestCompletionSummary(): void {
    if (!this.result() || !this.completionSummaryAvailable() || this.completionSummaryLoading()) return;
    this.completionSummaryRequested.emit();
  }

  private isAllowed(candidate: BuilderCourseReintegrationTarget): boolean {
    const required = this.requiredTarget();
    return required === null || sameTarget(required, candidate);
  }
}

function targetFromCandidate(candidate: BuilderCourseMergeCandidate): BuilderCourseReintegrationTarget {
  return {
    kind: 'EXISTING_LINE',
    lineId: candidate.lineId,
    anchor: {
      kind: candidate.anchor.kind,
      nodeId: candidate.anchor.nodeId,
      normalizedFen: candidate.anchor.normalizedFen,
    },
  };
}

function sameTarget(
  left: BuilderCourseReintegrationTarget,
  right: BuilderCourseReintegrationTarget,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'NEW_LINE' && right.kind === 'NEW_LINE') return left.name === right.name;
  if (left.kind !== 'EXISTING_LINE' || right.kind !== 'EXISTING_LINE') return false;
  return left.lineId === right.lineId
    && left.anchor.kind === right.anchor.kind
    && left.anchor.nodeId === right.anchor.nodeId
    && left.anchor.normalizedFen === right.anchor.normalizedFen;
}

function syncDisabled(control: AbstractControl, disabled: boolean): void {
  if (disabled && control.enabled) control.disable({ emitEvent: false });
  if (!disabled && control.disabled) control.enable({ emitEvent: false });
}