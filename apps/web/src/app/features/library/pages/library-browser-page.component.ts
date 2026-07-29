import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ContextStripComponent,
  type UiContextItem,
} from '../../../shared/ui/context-strip/context-strip.component';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { MEDIA_QUERIES } from '../../../shared/ui/responsive/breakpoints';
import { StudyLineListComponent } from '../components/study-line-list/study-line-list.component';
import { StudyMobileLauncherComponent } from '../components/study-mobile-launcher/study-mobile-launcher.component';
import {
  StudyLauncherStartTraining,
  StudyLauncherSummary,
} from '../components/study-mobile-launcher/study-mobile-launcher.models';
import {
  StudyScopeItem,
  StudyScopeListComponent,
} from '../components/study-scope-list/study-scope-list.component';
import { TrainingBasketPanelComponent } from '../components/training-basket-panel/training-basket-panel.component';
import { LibraryApiService } from '../data-access/library-api.service';
import { coverageLabel, masteryLabel } from '../helpers/library-line.helpers';
import { lineGroupTrainingSummary } from '../helpers/training-summary.helpers';
import { LibraryBrowserStore } from '../state/library-browser.store';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    ContextStripComponent,
    StudyScopeListComponent,
    StudyLineListComponent,
    TrainingBasketPanelComponent,
    StudyMobileLauncherComponent,
  ],
  providers: [LibraryApiService, LibraryBrowserStore],
  templateUrl: './library-browser-page.component.html',
  styleUrl: './library-browser-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBrowserPageComponent implements OnInit {
  protected readonly store = inject(LibraryBrowserStore);
  private mobileReturnFocusElement: HTMLElement | null = null;
  protected readonly mobileLauncherOpen = signal(false);
  protected readonly courseItems = computed<StudyScopeItem[]>(() =>
    this.store.filteredCourses().map((course) => ({
      id: course.id,
      title: course.name,
      description: course.description || 'Personal repertoire',
      meta: this.store.courseMeta(course),
    })),
  );
  protected readonly chapterItems = computed<StudyScopeItem[]>(() =>
    this.store.filteredChapters().map((chapter) => ({
      id: chapter.id,
      title: chapter.name,
      description: chapter.description || 'Opening section',
      meta: this.store.chapterLineMeta(chapter),
    })),
  );
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    {
      id: 'repertoires',
      label: 'Repertoires',
      value: this.store.filteredCourses().length,
    },
    {
      id: 'sections',
      label: 'Sections',
      value: this.store.filteredChapters().length,
    },
    {
      id: 'selected-lines',
      label: 'Selected lines',
      value: this.store.selectedLineIds().length,
    },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'filters',
      kind: 'toggle',
      label: 'Review filter',
      pressed: this.store.reviewOnly(),
      run: () => this.store.toggleReviewOnly(),
    },
    {
      id: 'select-visible',
      label: 'Select visible lines',
      disabled: this.store.filteredLines().length === 0,
      run: () => this.store.selectAllVisibleLines(),
    },
  ]);
  protected readonly selectedCourseLabel = computed(
    () => this.store.selectedCourse()?.name ?? 'Choose a repertoire',
  );
  protected readonly selectedChapterLabel = computed(
    () => this.store.selectedChapter()?.name ?? 'Choose a section',
  );
  protected readonly selectedLinesLabel = computed(() => {
    const selectedCount = this.store.selectedLineIds().length;
    return selectedCount > 0 ? `${selectedCount} selected` : 'Optional multi-select';
  });
  protected readonly selectionContextItems = computed<readonly UiContextItem[]>(() => [
    {
      id: 'repertoire',
      marker: '1',
      label: 'Repertoire',
      value: this.selectedCourseLabel(),
    },
    {
      id: 'section',
      marker: '2',
      label: 'Section',
      value: this.selectedChapterLabel(),
    },
    {
      id: 'lines',
      marker: '3',
      label: 'Lines',
      value: this.selectedLinesLabel(),
    },
  ]);
  protected readonly courseSummary = computed<StudyLauncherSummary>(() => {
    const course = this.store.selectedCourse();
    const stats = this.store.selectedCourseStats();
    return {
      title: course ? course.name : 'No course selected',
      description: course?.description || 'Train the selected repertoire.',
      lineCountLabel: 'Sections',
      lineCount: this.store.chapters().length,
      activeSublineCount: stats?.activeSublineCount ?? 0,
      weakSublineCount: stats?.weakSublineCount ?? 0,
      untrainedSublineCount: stats?.untrainedSublineCount ?? 0,
      coverageLabel: stats
        ? coverageLabel(stats.trainedSublineCount, stats.activeSublineCount)
        : 'Stats loading',
      masteryLabel: stats ? masteryLabel(stats.passRate) : 'Stats loading',
      canStart: Boolean(course),
    };
  });
  protected readonly chapterSummary = computed<StudyLauncherSummary>(() => {
    const chapter = this.store.selectedChapter();
    return {
      title: chapter ? chapter.name : 'No section selected',
      description: chapter?.description || 'Train the currently selected section.',
      lineCountLabel: 'Lines',
      lineCount: this.store.lines().length,
      ...lineGroupTrainingSummary(this.store.lines()),
      canStart: Boolean(chapter),
    };
  });
  protected readonly lineSummary = computed<StudyLauncherSummary>(() => {
    const line = this.store.selectedLine();
    return {
      title: line ? line.name : 'No line selected',
      description: line
        ? `Train one line as ${line.sideToTrain === 'WHITE' ? 'White' : 'Black'}.`
        : 'Choose one line to train.',
      lineCountLabel: 'Lines',
      lineCount: line ? 1 : 0,
      ...lineGroupTrainingSummary(line ? [line] : []),
      canStart: Boolean(line),
    };
  });

  ngOnInit(): void {
    void this.store.loadCourses();
  }

  protected async selectCourse(courseId: number): Promise<void> {
    this.mobileReturnFocusElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await this.store.selectCourse(courseId);
    if (window.matchMedia(MEDIA_QUERIES.mobile).matches) {
      this.mobileLauncherOpen.set(true);
    }
  }

  protected closeMobileLauncher(): void {
    this.mobileLauncherOpen.set(false);
    window.setTimeout(() => this.mobileReturnFocusElement?.focus(), 0);
  }

  protected startTraining(event: StudyLauncherStartTraining): void {
    if (event.scope === 'LINE') {
      this.store.startSingleLineMarathon(event.lineId, event.mode);
      return;
    }
    this.store.startSelectedMarathon(event.mode, event.scope);
  }
}
