import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import type { LibraryMarathonMode, LibraryTrainingScope } from '../../data-access/library.models';

export interface TrainingBasketStart {
  mode: LibraryMarathonMode;
  scope: LibraryTrainingScope;
}

interface SessionOption<T> {
  id: T;
  label: string;
  caption: string;
  disabled: boolean;
}

@Component({
  selector: 'app-training-basket-panel',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './training-basket-panel.component.html',
  styleUrl: './training-basket-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingBasketPanelComponent {
  readonly activeSublineCount = input.required<number>();
  readonly weakSublineCount = input.required<number>();
  readonly untrainedSublineCount = input.required<number>();
  readonly sourceLabel = input.required<string>();
  readonly scope = input.required<LibraryTrainingScope>();
  readonly mode = input.required<LibraryMarathonMode>();
  readonly canUseCourseScope = input.required<boolean>();
  readonly canUseChapterScope = input.required<boolean>();
  readonly canUseSelectedLinesScope = input.required<boolean>();
  readonly canStart = input.required<boolean>();
  readonly scopeChange = output<LibraryTrainingScope>();
  readonly modeChange = output<LibraryMarathonMode>();
  readonly startMode = output<TrainingBasketStart>();

  protected readonly scopeOptions = computed<readonly SessionOption<LibraryTrainingScope>[]>(
    () => [
      {
        id: 'COURSE',
        label: 'Whole course',
        caption: 'Every active subline',
        disabled: !this.canUseCourseScope(),
      },
      {
        id: 'CHAPTER',
        label: 'This section',
        caption: 'The open section only',
        disabled: !this.canUseChapterScope(),
      },
      {
        id: 'SELECTED_LINES',
        label: 'Selected lines',
        caption: 'Your current selection',
        disabled: !this.canUseSelectedLinesScope(),
      },
    ],
  );
  protected readonly modeOptions = computed<readonly SessionOption<LibraryMarathonMode>[]>(
    () => [
      {
        id: 'DAILY_REVIEW',
        label: 'Daily Review',
        caption: 'Scheduled for today',
        disabled: !this.canStart() || this.activeSublineCount() === 0,
      },
      {
        id: 'ALL',
        label: 'All',
        caption: 'Everything in scope',
        disabled: !this.canStart() || this.activeSublineCount() === 0,
      },
      {
        id: 'WEAK_SUBLINES',
        label: 'Weak',
        caption: 'Needs reinforcement',
        disabled: !this.canStart() || this.weakSublineCount() === 0,
      },
      {
        id: 'UNTRAINED_SUBLINES',
        label: 'Untrained',
        caption: 'Not attempted yet',
        disabled: !this.canStart() || this.untrainedSublineCount() === 0,
      },
    ],
  );
  protected readonly startCount = computed(() => {
    switch (this.mode()) {
      case 'WEAK_SUBLINES':
        return this.weakSublineCount();
      case 'UNTRAINED_SUBLINES':
        return this.untrainedSublineCount();
      default:
        return this.activeSublineCount();
    }
  });
  protected readonly canStartMode = computed(
    () => this.canStart() && this.startCount() > 0,
  );
  protected readonly startLabel = computed(() => {
    if (this.mode() === 'DAILY_REVIEW') return 'Start Daily Review';
    const count = this.startCount();
    return `Start ${count} ${count === 1 ? 'subline' : 'sublines'}`;
  });
  protected readonly selectedScopeLabel = computed(
    () => this.scopeOptions().find((option) => option.id === this.scope())?.label ?? 'Not set',
  );
  protected readonly selectedModeLabel = computed(
    () => this.modeOptions().find((option) => option.id === this.mode())?.label ?? 'Not set',
  );
  protected readonly materialLabel = computed(() => {
    const count = this.startCount();
    return `${count} ${count === 1 ? 'subline' : 'sublines'}`;
  });

  protected selectScope(scope: LibraryTrainingScope): void {
    this.scopeChange.emit(scope);
  }

  protected selectMode(mode: LibraryMarathonMode): void {
    this.modeChange.emit(mode);
  }

  protected startTraining(): void {
    if (!this.canStartMode()) return;
    this.startMode.emit({ mode: this.mode(), scope: this.scope() });
  }
}
