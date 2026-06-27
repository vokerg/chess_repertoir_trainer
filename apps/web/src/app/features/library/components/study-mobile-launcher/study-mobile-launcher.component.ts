import { ChangeDetectionStrategy, Component, HostListener, computed, input, output, signal } from '@angular/core';
import { LibraryChapter, LibraryCourse, LibraryLine, LibraryMarathonMode } from '../../data-access/library.models';
import { coverageLabel, masteryLabel, sideLabel } from '../../helpers/library-line.helpers';
import { StudyLauncherScope, StudyLauncherStartTraining, StudyLauncherSummary } from './study-mobile-launcher.models';

interface TrainingModeOption {
  id: LibraryMarathonMode;
  label: string;
  disabled: boolean;
}

@Component({
  selector: 'app-study-mobile-launcher',
  standalone: true,
  templateUrl: './study-mobile-launcher.component.html',
  styleUrl: './study-mobile-launcher.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyMobileLauncherComponent {
  readonly selectedCourse = input.required<LibraryCourse | null>();
  readonly selectedChapter = input.required<LibraryChapter | null>();
  readonly visibleChapters = input.required<LibraryChapter[]>();
  readonly visibleLines = input.required<LibraryLine[]>();
  readonly selectedLineId = input.required<number | null>();
  readonly courseSummary = input.required<StudyLauncherSummary>();
  readonly chapterSummary = input.required<StudyLauncherSummary>();
  readonly lineSummary = input.required<StudyLauncherSummary>();

  readonly selectChapter = output<number>();
  readonly selectLine = output<number>();
  readonly startTraining = output<StudyLauncherStartTraining>();
  readonly close = output<void>();

  protected readonly activeScope = signal<StudyLauncherScope>('COURSE');
  protected readonly sideLabel = sideLabel;
  protected readonly coverageLabel = coverageLabel;
  protected readonly masteryLabel = masteryLabel;

  protected readonly activeSummary = computed(() => {
    switch (this.activeScope()) {
      case 'CHAPTER':
        return this.chapterSummary();
      case 'LINE':
        return this.lineSummary();
      case 'COURSE':
        return this.courseSummary();
    }
  });

  protected readonly trainingModes = computed<TrainingModeOption[]>(() => {
    const summary = this.activeSummary();
    return [
      { id: 'ALL', label: 'All', disabled: !summary.canStart || summary.activeSublineCount === 0 },
      { id: 'WEAK_SUBLINES', label: 'Weak', disabled: !summary.canStart || summary.weakSublineCount === 0 },
      {
        id: 'UNTRAINED_SUBLINES',
        label: 'Untrained',
        disabled: !summary.canStart || summary.untrainedSublineCount === 0,
      },
    ];
  });

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }

  protected setScope(scope: StudyLauncherScope): void {
    this.activeScope.set(scope);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected start(mode: LibraryMarathonMode): void {
    switch (this.activeScope()) {
      case 'COURSE':
        this.startTraining.emit({ scope: 'COURSE', mode });
        return;
      case 'CHAPTER':
        this.startTraining.emit({ scope: 'CHAPTER', mode });
        return;
      case 'LINE': {
        const lineId = this.selectedLineId();
        if (lineId !== null) {
          this.startTraining.emit({ scope: 'LINE', lineId, mode });
        }
      }
    }
  }
}
