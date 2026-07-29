import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
  type BuilderCourseDraft,
  type BuilderCourseReintegrationApplyResponse,
  type BuilderCourseReintegrationPreviewResponse,
  type BuilderCourseReintegrationTarget,
} from '@chess-trainer/contracts/courses';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import {
  buildBuilderCourseDraft,
  type BuilderSession,
} from 'chess-domain';
import { firstValueFrom } from 'rxjs';
import {
  RepertoireBuilderApiService,
  type RepertoireBuilderChapterOption,
  type RepertoireBuilderCourseOption,
} from '../data-access/repertoire-builder-api.service';

@Injectable()
export class RepertoireBuilderCourseStore {
  private readonly api = inject(RepertoireBuilderApiService);
  private readonly openState = signal(false);
  private readonly coursesState = signal<RepertoireBuilderCourseOption[]>([]);
  private readonly chaptersState = signal<RepertoireBuilderChapterOption[]>([]);
  private readonly selectedCourseIdState = signal<number | null>(null);
  private readonly selectedChapterIdState = signal<number | null>(null);
  private readonly newLineNameState = signal('');
  private readonly draftState = signal<BuilderCourseDraft | null>(null);
  private readonly previewState = signal<BuilderCourseReintegrationPreviewResponse | null>(null);
  private readonly selectedTargetState = signal<BuilderCourseReintegrationTarget | null>(null);
  private readonly resultState = signal<BuilderCourseReintegrationApplyResponse | null>(null);
  private readonly destinationsLoadingState = signal(false);
  private readonly previewLoadingState = signal(false);
  private readonly applyLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private destinationRequestVersion = 0;
  private previewRequestVersion = 0;

  readonly open = this.openState.asReadonly();
  readonly courses = this.coursesState.asReadonly();
  readonly chapters = this.chaptersState.asReadonly();
  readonly selectedCourseId = this.selectedCourseIdState.asReadonly();
  readonly selectedChapterId = this.selectedChapterIdState.asReadonly();
  readonly newLineName = this.newLineNameState.asReadonly();
  readonly draft = this.draftState.asReadonly();
  readonly preview = this.previewState.asReadonly();
  readonly selectedTarget = this.selectedTargetState.asReadonly();
  readonly result = this.resultState.asReadonly();
  readonly destinationsLoading = this.destinationsLoadingState.asReadonly();
  readonly previewLoading = this.previewLoadingState.asReadonly();
  readonly applyLoading = this.applyLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly canPreview = computed(() => (
    this.draft() !== null
    && this.selectedChapterId() !== null
    && this.newLineName().trim().length > 0
    && !this.destinationsLoading()
    && !this.previewLoading()
    && !this.applyLoading()
  ));
  readonly canApply = computed(() => (
    this.preview() !== null
    && this.selectedTarget() !== null
    && !this.previewLoading()
    && !this.applyLoading()
  ));

  async openFor(session: BuilderSession<RepertoireTarget>): Promise<void> {
    this.errorState.set(null);
    try {
      this.draftState.set(buildBuilderCourseDraft(session));
    } catch (error) {
      this.errorState.set(errorMessage(error, 'This draft is not ready for course review.'));
      return;
    }
    this.resetDestinationState();
    this.openState.set(true);
    await this.loadCourses();
  }

  close(): void {
    if (this.applyLoading()) return;
    this.openState.set(false);
  }

  async selectCourse(courseId: number | null): Promise<void> {
    this.selectedCourseIdState.set(courseId);
    this.selectedChapterIdState.set(null);
    this.chaptersState.set([]);
    this.clearPreview();
    if (courseId === null) return;
    const requestVersion = ++this.destinationRequestVersion;
    this.destinationsLoadingState.set(true);
    this.errorState.set(null);
    try {
      const chapters = await firstValueFrom(this.api.listChapters(courseId));
      if (requestVersion !== this.destinationRequestVersion) return;
      this.chaptersState.set([...chapters].sort((left, right) => (
        left.sortOrder - right.sortOrder || left.id - right.id
      )));
    } catch (error) {
      if (requestVersion !== this.destinationRequestVersion) return;
      this.errorState.set(errorMessage(error, 'Could not load course chapters.'));
    } finally {
      if (requestVersion === this.destinationRequestVersion) {
        this.destinationsLoadingState.set(false);
      }
    }
  }

  selectChapter(chapterId: number | null): void {
    this.selectedChapterIdState.set(chapterId);
    this.clearPreview();
  }

  setNewLineName(value: string): void {
    this.newLineNameState.set(value);
    this.clearPreview();
  }

  selectTarget(target: BuilderCourseReintegrationTarget): void {
    this.selectedTargetState.set(target);
    this.resultState.set(null);
    this.errorState.set(null);
  }

  async previewCourseOutput(): Promise<void> {
    const draft = this.draft();
    const chapterId = this.selectedChapterId();
    const newLineName = this.newLineName().trim();
    if (!draft || chapterId === null || newLineName.length === 0 || this.previewLoading()) return;
    const requestVersion = ++this.previewRequestVersion;
    this.previewLoadingState.set(true);
    this.errorState.set(null);
    this.previewState.set(null);
    this.selectedTargetState.set(null);
    this.resultState.set(null);
    try {
      const preview = await firstValueFrom(this.api.previewCourseOutput(chapterId, {
        contractVersion: BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
        draft,
        newLineName,
      }));
      if (requestVersion !== this.previewRequestVersion) return;
      this.previewState.set(preview);
      this.selectedTargetState.set(defaultTarget(preview, newLineName));
    } catch (error) {
      if (requestVersion !== this.previewRequestVersion) return;
      this.errorState.set(errorMessage(error, 'Could not preview this draft against the selected chapter.'));
    } finally {
      if (requestVersion === this.previewRequestVersion) this.previewLoadingState.set(false);
    }
  }

  async applyCourseOutput(): Promise<void> {
    const draft = this.draft();
    const preview = this.preview();
    const target = this.selectedTarget();
    const chapterId = this.selectedChapterId();
    if (!draft || !preview || !target || chapterId === null || this.applyLoading()) return;
    this.applyLoadingState.set(true);
    this.errorState.set(null);
    this.resultState.set(null);
    try {
      const result = await firstValueFrom(this.api.applyCourseOutput(chapterId, {
        contractVersion: BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
        draft,
        newLineName: this.newLineName().trim(),
        previewToken: preview.previewToken,
        target,
      }));
      this.resultState.set(result);
    } catch (error) {
      this.errorState.set(errorMessage(error, 'Could not apply this reviewed course output.'));
      this.previewState.set(null);
      this.selectedTargetState.set(null);
    } finally {
      this.applyLoadingState.set(false);
    }
  }

  private async loadCourses(): Promise<void> {
    const requestVersion = ++this.destinationRequestVersion;
    this.destinationsLoadingState.set(true);
    try {
      const courses = await firstValueFrom(this.api.listCourses());
      if (requestVersion !== this.destinationRequestVersion) return;
      this.coursesState.set([...courses].sort((left, right) => (
        left.name.localeCompare(right.name) || left.id - right.id
      )));
    } catch (error) {
      if (requestVersion !== this.destinationRequestVersion) return;
      this.errorState.set(errorMessage(error, 'Could not load courses.'));
    } finally {
      if (requestVersion === this.destinationRequestVersion) {
        this.destinationsLoadingState.set(false);
      }
    }
  }

  private resetDestinationState(): void {
    this.destinationRequestVersion += 1;
    this.previewRequestVersion += 1;
    this.coursesState.set([]);
    this.chaptersState.set([]);
    this.selectedCourseIdState.set(null);
    this.selectedChapterIdState.set(null);
    this.newLineNameState.set('');
    this.previewState.set(null);
    this.selectedTargetState.set(null);
    this.resultState.set(null);
    this.destinationsLoadingState.set(false);
    this.previewLoadingState.set(false);
    this.applyLoadingState.set(false);
  }

  private clearPreview(): void {
    this.previewRequestVersion += 1;
    this.previewState.set(null);
    this.selectedTargetState.set(null);
    this.resultState.set(null);
    this.previewLoadingState.set(false);
    this.errorState.set(null);
  }
}

function defaultTarget(
  preview: BuilderCourseReintegrationPreviewResponse,
  newLineName: string,
): BuilderCourseReintegrationTarget | null {
  if (preview.newLine.allowed) return { kind: 'NEW_LINE', name: newLineName };
  const candidate = preview.candidates.find((item) => item.counts.conflictingMoves === 0);
  if (!candidate) return null;
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

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'error' in error) {
    const payload = (error as { error?: unknown }).error;
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const nested = (payload as { error?: unknown }).error;
      if (typeof nested === 'string') return nested;
    }
  }
  return fallback;
}
