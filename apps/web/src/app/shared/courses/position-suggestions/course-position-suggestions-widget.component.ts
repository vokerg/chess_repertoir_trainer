import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoursePositionSuggestionsApiService } from './course-position-suggestions-api.service';
import { CoursePositionSuggestion } from './course-position-suggestions.models';

@Component({
  selector: 'app-course-position-suggestions-widget',
  standalone: true,
  templateUrl: './course-position-suggestions-widget.component.html',
  styleUrl: './course-position-suggestions-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePositionSuggestionsWidgetComponent {
  private readonly api = inject(CoursePositionSuggestionsApiService);

  readonly fen = input.required<string>();
  readonly title = input('Moves from your courses');
  readonly moveSelected = output<CoursePositionSuggestion>();

  protected readonly suggestions = signal<CoursePositionSuggestion[]>([]);
  protected readonly normalizedFen = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly suggestionGroups = computed(() => groupSuggestions(this.suggestions()));
  private requestSeq = 0;
  private requestedFen: string | null = null;

  constructor() {
    effect(() => {
      const fen = this.fen();
      if (fen === this.requestedFen) return;
      this.requestedFen = fen;
      untracked(() => {
        void this.loadForFen(fen);
      });
    });
  }

  private async loadForFen(fen: string): Promise<void> {
    const requestId = ++this.requestSeq;
    this.loading.set(true);
    this.error.set(null);
    this.suggestions.set([]);

    try {
      const response = await firstValueFrom(this.api.listForFen(fen));
      if (requestId !== this.requestSeq) return;
      this.normalizedFen.set(response.normalizedFen);
      this.suggestions.set(response.suggestions);
      this.loading.set(false);
    } catch (error) {
      if (requestId !== this.requestSeq) return;
      this.normalizedFen.set(null);
      this.error.set(readError(error, 'Could not load course suggestions.'));
      this.loading.set(false);
    }
  }
}

interface CoursePositionSuggestionGroup {
  id: string;
  moveLabel: string;
  contextLabel: string;
  suggestion: CoursePositionSuggestion;
}

function groupSuggestions(
  suggestions: CoursePositionSuggestion[],
): CoursePositionSuggestionGroup[] {
  const groups = new Map<string, CoursePositionSuggestion[]>();
  for (const suggestion of suggestions) {
    const key = `${suggestion.courseId}:${suggestion.moveUci}`;
    groups.set(key, [...(groups.get(key) ?? []), suggestion]);
  }

  return Array.from(groups.entries()).map(([id, groupSuggestions]) => {
    const suggestion = groupSuggestions[0];
    const chapterNames = uniqueSorted(groupSuggestions.map((item) => item.chapterName));
    const lineNames = uniqueSorted(groupSuggestions.map((item) => item.lineName));
    const contextParts = [suggestion.courseName];

    if (chapterNames.length === 1) {
      contextParts.push(chapterNames[0]);
      if (lineNames.length === 1) contextParts.push(lineNames[0]);
    }

    return {
      id,
      moveLabel: suggestion.moveSan,
      contextLabel: contextParts.join(', '),
      suggestion,
    };
  });
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { error?: string; message?: string } };
  return response?.error?.error || response?.error?.message || fallback;
}
