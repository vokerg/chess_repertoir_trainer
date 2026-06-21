import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { type UiShellAction, type UiShellStat } from '../../../../shared/ui/ui-shell.model';
import { LibraryMarathonMode } from '../../data-access/library.models';

@Component({
  selector: 'app-training-basket-panel',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './training-basket-panel.component.html',
  styleUrl: './training-basket-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingBasketPanelComponent {
  readonly lineCount = input.required<number>();
  readonly activeSublineCount = input.required<number>();
  readonly recentAttempts = input.required<number>();
  readonly weakSublineCount = input.required<number>();
  readonly untrainedSublineCount = input.required<number>();
  readonly coverageLabel = input.required<string>();
  readonly masteryLabel = input.required<string>();
  readonly sourceLabel = input.required<string>();
  readonly mode = input.required<LibraryMarathonMode>();
  readonly canStart = input.required<boolean>();
  readonly start = output<void>();
  readonly clear = output<void>();
  readonly modeChange = output<LibraryMarathonMode>();

  protected readonly basketSubtitle = computed(
    () => `Coverage ${this.coverageLabel()} - Mastery ${this.masteryLabel()}`,
  );
  protected readonly basketStats = computed<readonly UiShellStat[]>(() => [
    { id: 'lines', label: 'Lines', value: this.lineCount() },
    { id: 'sublines', label: 'Sublines', value: this.activeSublineCount() },
    { id: 'attempts', label: 'Attempts', value: this.recentAttempts() },
    { id: 'weak', label: 'Weak', value: this.weakSublineCount() },
    { id: 'untrained', label: 'Untrained', value: this.untrainedSublineCount() },
  ]);
  protected readonly basketActions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'start',
      label: 'Start marathon',
      disabled: !this.canStart(),
      run: () => this.start.emit(),
    },
    {
      id: 'clear',
      label: 'Clear lines',
      disabled: this.lineCount() === 0,
      run: () => this.clear.emit(),
    },
  ]);
}
