import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { LibraryMarathonMode, LibraryTrainingScope } from '../../data-access/library.models';

export interface TrainingBasketStart {
  mode: LibraryMarathonMode;
  scope: LibraryTrainingScope;
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
  readonly lineCountLabel = input('Lines');
  readonly lineCount = input.required<number>();
  readonly activeSublineCount = input.required<number>();
  readonly recentAttempts = input.required<number>();
  readonly weakSublineCount = input.required<number>();
  readonly untrainedSublineCount = input.required<number>();
  readonly coverageLabel = input.required<string>();
  readonly masteryLabel = input.required<string>();
  readonly sourceLabel = input.required<string>();
  readonly scope = input.required<LibraryTrainingScope>();
  readonly canUseCourseScope = input.required<boolean>();
  readonly canUseChapterScope = input.required<boolean>();
  readonly canUseSelectedLinesScope = input.required<boolean>();
  readonly canStart = input.required<boolean>();
  readonly scopeChange = output<LibraryTrainingScope>();
  readonly startMode = output<TrainingBasketStart>();

  protected readonly basketSubtitle = computed(
    () => `Coverage ${this.coverageLabel()} - Mastery ${this.masteryLabel()}`,
  );
  protected readonly basketStats = computed(() => [
    { id: 'lines', label: this.lineCountLabel(), value: this.lineCount() },
    { id: 'sublines', label: 'Sublines', value: this.activeSublineCount() },
    { id: 'attempts', label: 'Attempts', value: this.recentAttempts() },
    { id: 'weak', label: 'Weak', value: this.weakSublineCount() },
    { id: 'untrained', label: 'Untrained', value: this.untrainedSublineCount() },
  ]);
  protected readonly canStartAll = computed(() => this.canStart());
  protected readonly canStartWeak = computed(() => this.canStart() && this.weakSublineCount() > 0);
  protected readonly canStartUntrained = computed(() => this.canStart() && this.untrainedSublineCount() > 0);

  protected readonly scopeOptions = computed(() => [
    { id: 'COURSE' as const, label: 'Course', disabled: !this.canUseCourseScope() },
    { id: 'CHAPTER' as const, label: 'Section', disabled: !this.canUseChapterScope() },
    { id: 'SELECTED_LINES' as const, label: 'Selected', disabled: !this.canUseSelectedLinesScope() },
  ]);

  protected selectScope(scope: LibraryTrainingScope): void {
    this.scopeChange.emit(scope);
  }

  protected startMarathon(mode: LibraryMarathonMode): void {
    this.startMode.emit({ mode, scope: this.scope() });
  }
}
