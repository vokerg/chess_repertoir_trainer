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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  BuilderCourseDraft,
  BuilderCourseMergeCandidate,
  BuilderCourseReintegrationApplyResponse,
  BuilderCourseReintegrationPreviewResponse,
  BuilderCourseReintegrationTarget,
} from '@chess-trainer/contracts/courses';
import type {
  RepertoireBuilderChapterOption,
  RepertoireBuilderCourseOption,
} from '../data-access/repertoire-builder-api.service';

@Component({
  selector: 'app-repertoire-builder-course-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './repertoire-builder-course-dialog.component.html',
  styleUrl: './repertoire-builder-course-dialog.component.css',
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
  readonly result = input<BuilderCourseReintegrationApplyResponse | null>(null);
  readonly destinationsLoading = input(false);
  readonly previewLoading = input(false);
  readonly applyLoading = input(false);
  readonly error = input<string | null>(null);
  readonly canPreview = input(false);
  readonly canApply = input(false);

  readonly courseSelected = output<number | null>();
  readonly chapterSelected = output<number | null>();
  readonly newLineNameChanged = output<string>();
  readonly previewRequested = output<void>();
  readonly targetSelected = output<BuilderCourseReintegrationTarget>();
  readonly applyRequested = output<void>();
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
      this.form.setValue({
        courseId: this.selectedCourseId(),
        chapterId: this.selectedChapterId(),
        newLineName: this.newLineName(),
      }, { emitEvent: false });
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
    this.targetSelected.emit({ kind: 'NEW_LINE', name: this.form.controls.newLineName.value.trim() });
  }

  protected selectCandidate(candidate: BuilderCourseMergeCandidate): void {
    this.targetSelected.emit({
      kind: 'EXISTING_LINE',
      lineId: candidate.lineId,
      anchor: {
        kind: candidate.anchor.kind,
        nodeId: candidate.anchor.nodeId,
        normalizedFen: candidate.anchor.normalizedFen,
      },
    });
  }

  protected isNewLineSelected(): boolean {
    return this.selectedTarget()?.kind === 'NEW_LINE';
  }

  protected isCandidateSelected(candidate: BuilderCourseMergeCandidate): boolean {
    const target = this.selectedTarget();
    return target?.kind === 'EXISTING_LINE'
      && target.lineId === candidate.lineId
      && target.anchor.kind === candidate.anchor.kind
      && target.anchor.nodeId === candidate.anchor.nodeId
      && target.anchor.normalizedFen === candidate.anchor.normalizedFen;
  }

  protected apply(): void {
    if (this.canApply()) this.applyRequested.emit();
  }
}
