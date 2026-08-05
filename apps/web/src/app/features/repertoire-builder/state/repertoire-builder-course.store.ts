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
  normalizeFenForPosition,
  type BuilderSession,
} from 'chess-domain';
import { firstValueFrom } from 'rxjs';
import {
  RepertoireBuilderApiService,
  type RepertoireBuilderChapterOption,
  type RepertoireBuilderCourseOption,
} from '../data-access/repertoire-builder-api.service';
import type { RepertoireBuilderCourseFindingLaunch } from '../helpers/repertoire-builder-launch';

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
  private readonly requiredTargetState = signal<BuilderCourseReintegrationTarget | null>(null);
  private readonly destinationLockedState = signal(false);
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
  readonly requiredTarget = this.requiredTargetState.asReadonly();
  readonly destinationLocked = this.destinationLockedState.asReadonly();
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
    && this.targetAllowed(this.selectedTarget()!)
    && !this.previewLoading()
    && !this.applyLoading()
  ));

  async openFor(
    session: BuilderSession<RepertoireTarget>,
    launch: RepertoireBuilderCourseFindingLaunch | null = null,
  ): Promise<void> {
    this.errorState.set(null);
    try {
      this.draftState.set(buildBuilderCourseDraft(session));
    } catch (error) {
      this.errorState.set(errorMessage(error, 'This draft is not ready for course review.'));
      return;
    }
    this.resetDestinationState();
    this.destinationLockedState.set(launch !== null);
    this.openState.set(true);
    await this.loadCourses();
    if (launch) await this.initializeLockedDestination(launch);
  }

  close(): void {
    if (this.applyLoading()) return;
    this.openState.set(false);
  }

  async selectCourse(courseId: number | null): Promise<void> {
    if (this.destinationLocked()) return;
    await this.setCourseSelection(courseId);
  }

  selectChapter(chapterId: number | null): void {
    if (this.destinationLocked()) return;
    this.selectedChapterIdState.set(chapterId);
    this.clearPreview();
  }

  setNewLineName(value: string): void {
    if (this.destinationLocked()) return;
    this.newLineNameState.set(value);
    this.clearPreview();
  }

  selectTarget(target: BuilderCourseReintegrationTarget): void {
    if (!this.targetAllowed(target)) return;
    this.selectedTargetState.set(target);
    this.resultState.set(null);
    this.errorState.set(null);
  }

  targetAllowed(target: BuilderCourseReintegrationTarget): boolean {
    const required = this.requiredTarget();
    return required === null || targetsEqual(required, target);
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
      const target = defaultTarget(preview, newLineName, this.requiredTarget());
      this.selectedTargetState.set(target);
      if (this.requiredTarget() && !target) {
        this.errorState.set(
          'The source course position no longer matches this exact line anchor. Return to Course review and refresh the finding.',
        );
      }
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
    if (
      !draft
      || !preview
      || !target
      || !this.targetAllowed(target)
      || chapterId === null
      || this.applyLoading()
    ) return;
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

  private async initializeLockedDestination(
    launch: RepertoireBuilderCourseFindingLaunch,
  ): Promise<void> {
    const requiredTarget: BuilderCourseReintegrationTarget = {
      kind: 'EXISTING_LINE',
      lineId: launch.lineId,
      anchor: {
        kind: launch.anchorKind,
        nodeId: launch.nodeId,
        normalizedFen: normalizeFenForPosition(launch.startingFen),
      },
    };
    this.requiredTargetState.set(requiredTarget);
    this.newLineNameState.set(launch.lineName);

    if (!this.courses().some((course) => course.id === launch.courseId)) {
      this.errorState.set('The source course is no longer available to this user.');
      return;
    }

    await this.setCourseSelection(launch.courseId);
    if (!this.chapters().some((chapter) => chapter.id === launch.chapterId)) {
      this.errorState.set('The source chapter is no longer available in this course.');
      return;
    }
    this.selectedChapterIdState.set(launch.chapterId);
  }

  private async setCourseSelection(courseId: number | null): Promise<void> {
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
    this.requiredTargetState.set(null);
    this.destinationLockedState.set(false);
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
  requiredTarget: BuilderCourseReintegrationTarget | null,
): BuilderCourseReintegrationTarget | null {
  if (requiredTarget) {
    const candidate = preview.candidates.find((item) => (
      item.counts.conflictingMoves === 0
      && targetsEqual(requiredTarget, candidateTarget(item))
    ));
    return candidate ? candidateTarget(candidate) : null;
  }
  if (preview.newLine.allowed) return { kind: 'NEW_LINE', name: newLineName };
  const candidate = preview.candidates.find((item) => item.counts.conflictingMoves === 0);
  return candidate ? candidateTarget(candidate) : null;
}

function candidateTarget(
  candidate: BuilderCourseReintegrationPreviewResponse['candidates'][number],
): BuilderCourseReintegrationTarget {
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

function targetsEqual(
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
