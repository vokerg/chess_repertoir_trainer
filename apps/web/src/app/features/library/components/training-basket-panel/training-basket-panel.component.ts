import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LibraryMarathonMode } from '../../data-access/library.models';

@Component({
  selector: 'app-training-basket-panel',
  standalone: true,
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
}
