import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalysisReintegrationApiService } from '../data-access/analysis-reintegration-api.service';
import { AnalysisReintegrationCandidate, AnalysisReintegrationPreviewResponse,
  AnalysisReintegrationTreePayload, ChapterOption, CourseOption, RepertoireColor } from '../data-access/analysis-reintegration.models';

@Injectable()
export class AnalysisReintegrationStore {
  private readonly api = inject(AnalysisReintegrationApiService);
  readonly open = signal(false); readonly analysisTree = signal<AnalysisReintegrationTreePayload | null>(null);
  readonly courses = signal<CourseOption[]>([]); readonly chapters = signal<ChapterOption[]>([]);
  readonly selectedCourseId = signal<number | null>(null); readonly selectedChapterId = signal<number | null>(null);
  readonly targetMode = signal<'EXISTING_LINE' | 'NEW_LINE'>('EXISTING_LINE');
  readonly selectedCandidateKey = signal<string | null>(null); readonly newLineName = signal('');
  readonly newLineSideToTrain = signal<RepertoireColor>('WHITE');
  readonly loadingCourses = signal(false); readonly loadingChapters = signal(false);
  readonly previewLoading = signal(false); readonly applying = signal(false);
  readonly error = signal<string | null>(null); readonly success = signal<string | null>(null);
  readonly preview = signal<AnalysisReintegrationPreviewResponse | null>(null);
  readonly canPreview = computed(() => Boolean(this.analysisTree() && this.selectedChapterId()));
  readonly candidates = computed(() => this.preview()?.candidates ?? []);
  readonly selectedCandidate = computed(() => this.candidates().find((candidate) => candidateKey(candidate) === this.selectedCandidateKey()) ?? null);
  readonly canApply = computed(() => {
    if (!this.selectedChapterId() || !this.preview() || this.previewLoading() || this.applying()) return false;
    if (this.targetMode() === 'EXISTING_LINE') return Boolean(this.selectedCandidate() && !this.selectedCandidate()!.counts.conflictingMoves);
    return Boolean(this.newLineName().trim());
  });
  private requestVersion = 0;

  async openForTree(tree: AnalysisReintegrationTreePayload): Promise<void> {
    this.requestVersion += 1; this.analysisTree.set(tree); this.open.set(true); this.selectedCourseId.set(null);
    this.selectedChapterId.set(null); this.chapters.set([]); this.preview.set(null); this.selectedCandidateKey.set(null);
    this.targetMode.set('EXISTING_LINE'); this.newLineName.set(''); this.newLineSideToTrain.set('WHITE');
    this.error.set(null); this.success.set(null); if (!this.courses().length) await this.loadCourses();
  }
  close(): void { this.requestVersion += 1; this.open.set(false); }
  async loadCourses(): Promise<void> {
    const version = ++this.requestVersion; this.loadingCourses.set(true); this.error.set(null);
    try { const courses = await firstValueFrom(this.api.getCourses()); if (version === this.requestVersion) this.courses.set(courses); }
    catch (error) { if (version === this.requestVersion) this.error.set(readAnalysisReintegrationError(error, 'Could not load courses.')); }
    finally { if (version === this.requestVersion) this.loadingCourses.set(false); }
  }
  async selectCourse(value: number | string): Promise<void> {
    const courseId = positiveNumber(value); const version = ++this.requestVersion;
    this.selectedCourseId.set(courseId); this.selectedChapterId.set(null); this.chapters.set([]); this.preview.set(null); this.selectedCandidateKey.set(null);
    if (!courseId) return; this.loadingChapters.set(true); this.error.set(null);
    try { const chapters = await firstValueFrom(this.api.getChapters(courseId));
      if (version !== this.requestVersion) return;
      this.chapters.set(chapters);
      this.selectedChapterId.set(chapters[0]?.id ?? null);
      this.loadingChapters.set(false);
      if (this.canPreview()) await this.previewSelectedChapter(); }
    catch (error) { if (version === this.requestVersion) this.error.set(readAnalysisReintegrationError(error, 'Could not load chapters.')); }
    finally { if (version === this.requestVersion) this.loadingChapters.set(false); }
  }
  async selectChapter(value: number | string): Promise<void> {
    this.selectedChapterId.set(positiveNumber(value)); this.preview.set(null); this.selectedCandidateKey.set(null);
    if (this.canPreview()) await this.previewSelectedChapter();
  }
  setTargetMode(mode: 'EXISTING_LINE' | 'NEW_LINE'): void { this.targetMode.set(mode); this.error.set(null); }
  selectCandidate(key: string): void { const candidate = this.candidates().find((item) => candidateKey(item) === key); if (candidate && !candidate.counts.conflictingMoves) this.selectedCandidateKey.set(key); }
  setNewLineName(value: string): void { this.newLineName.set(value); }
  setNewLineSideToTrain(value: RepertoireColor): void { this.newLineSideToTrain.set(value); void this.previewSelectedChapter(); }
  async previewSelectedChapter(): Promise<void> {
    const chapterId = this.selectedChapterId(); const tree = this.analysisTree(); if (!chapterId || !tree) return;
    const version = ++this.requestVersion; this.previewLoading.set(true); this.error.set(null); this.success.set(null);
    try { const preview = await firstValueFrom(this.api.preview(chapterId, { analysisTree: tree,
      newLineName: this.newLineName().trim() || undefined, newLineSideToTrain: this.newLineSideToTrain() }));
      if (version !== this.requestVersion) return; this.preview.set(preview);
      const selected = preview.candidates.find((candidate) => !candidate.counts.conflictingMoves);
      this.selectedCandidateKey.set(selected ? candidateKey(selected) : null);
    } catch (error) { if (version === this.requestVersion) this.error.set(readAnalysisReintegrationError(error, 'Could not preview reintegration.')); }
    finally { if (version === this.requestVersion) this.previewLoading.set(false); }
  }
  async apply(): Promise<void> {
    const chapterId = this.selectedChapterId(); const analysisTree = this.analysisTree(); if (!chapterId || !analysisTree || !this.canApply()) return;
    const target = this.targetMode() === 'EXISTING_LINE'
      ? (() => { const candidate = this.selectedCandidate()!; return { kind: 'EXISTING_LINE' as const, lineId: candidate.lineId,
          anchor: { kind: candidate.anchor.kind, nodeId: candidate.anchor.nodeId, normalizedFen: candidate.anchor.normalizedFen } }; })()
      : { kind: 'NEW_LINE' as const, name: this.newLineName().trim(), sideToTrain: this.newLineSideToTrain(),
          allowConflicts: true };
    const version = ++this.requestVersion; this.applying.set(true); this.error.set(null); this.success.set(null);
    try { const result = await firstValueFrom(this.api.apply(chapterId, { analysisTree, target }));
      if (version === this.requestVersion) { this.applying.set(false); await this.previewSelectedChapter();
        this.success.set(result.targetKind === 'NEW_LINE'
          ? `Created ${result.lineName}: ${result.createdMoves} added.`
          : `Merged into ${result.lineName}: ${result.createdMoves} added, ${result.reusedMoves} reused.`); } }
    catch (error) { if (version === this.requestVersion) this.error.set(readAnalysisReintegrationError(error, 'Could not apply reintegration.')); }
    finally { if (version === this.requestVersion) this.applying.set(false); }
  }
}

export function candidateKey(candidate: AnalysisReintegrationCandidate): string { return `${candidate.lineId}:${candidate.anchor.kind}:${candidate.anchor.nodeId ?? 'root'}`; }
function positiveNumber(value: number | string): number | null { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function readAnalysisReintegrationError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) { const response = error as { error?: { message?: string; error?: string } | string; message?: string };
    if (typeof response.error === 'string') return response.error; return response.error?.message || response.error?.error || response.message || fallback; }
  return fallback;
}
