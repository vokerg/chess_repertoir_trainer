import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CourseExtensionCandidatesResponse } from '@chess-trainer/contracts/lab';
import { CourseDetailApiService } from '../../../../courses/data-access/course-detail-api.service';
import type { CourseDetail } from '../../../../courses/data-access/course-detail.models';
import { defaultGameFilters, GameFilters } from '../../../../../shared/games/filters/game-filter.model';
import {
  emptyImportedGameFacets,
  ImportedGameFacetsResponse,
} from '../../../../../shared/games/game.models';
import { CourseExtensionCandidatesApiService } from '../data-access/course-extension-candidates-api.service';

@Injectable()
export class CourseExtensionCandidatesStore {
  private readonly api = inject(CourseExtensionCandidatesApiService);
  private readonly coursesApi = inject(CourseDetailApiService);

  readonly courses = signal<readonly CourseDetail[]>([]);
  readonly courseId = signal<number | null>(null);
  readonly minGames = signal(4);
  readonly gameFilters = signal<GameFilters>(defaultGameFilters());
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly report = signal<CourseExtensionCandidatesResponse | null>(null);
  readonly loadingCourses = signal(false);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly canLoad = computed(() => Boolean(this.courseId()) && !this.loading() && !this.loadingCourses());

  async initialize(): Promise<void> {
    this.loadingCourses.set(true);
    this.error.set(null);
    let initialCourseId: number | null = null;
    try {
      const [courses, facets] = await Promise.all([
        firstValueFrom(this.coursesApi.getCourses()),
        firstValueFrom(this.api.getFacets()).catch(() => emptyImportedGameFacets()),
      ]);
      this.courses.set(courses);
      this.facets.set(facets);
      initialCourseId = courses[0]?.id ?? null;
      this.courseId.set(initialCourseId);
    } catch {
      this.error.set('Could not load courses.');
    } finally {
      this.loadingCourses.set(false);
    }
    if (initialCourseId) await this.load();
  }

  setCourseId(value: number): void {
    this.courseId.set(Number.isInteger(value) && value > 0 ? value : null);
    this.clearReport();
  }

  setMinGames(value: number): void {
    if (!Number.isFinite(value)) return;
    this.minGames.set(Math.max(1, Math.min(1000, Math.trunc(value))));
  }

  setGameFilters(filters: GameFilters): void {
    this.gameFilters.set(filters);
  }

  resetGameFilters(): void {
    this.gameFilters.set(defaultGameFilters());
    void this.load();
  }

  async load(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId || !this.canLoad()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      this.report.set(await firstValueFrom(this.api.getCandidates({
        courseId,
        minGames: this.minGames(),
      }, this.gameFilters())));
      this.loaded.set(true);
    } catch (error) {
      this.error.set(readError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private clearReport(): void {
    this.report.set(null);
    this.loaded.set(false);
  }
}

function readError(error: unknown): string {
  const response = error as { error?: { message?: string; error?: string }; message?: string };
  return response?.error?.message || response?.error?.error || response?.message || 'Could not load course extension candidates.';
}
