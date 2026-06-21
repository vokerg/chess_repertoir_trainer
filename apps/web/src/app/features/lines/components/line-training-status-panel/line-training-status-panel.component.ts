import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LineSummary, SublineTrainingStatus } from '../../data-access/lines.models';
import { percentLabel, trainingStatusLabel } from '../../helpers/training-status.helpers';

@Component({
  selector: 'app-line-training-status-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './line-training-status-panel.component.html',
  styleUrl: './line-training-status-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineTrainingStatusPanelComponent {
  readonly line = input.required<LineSummary>();
  readonly sublines = input.required<SublineTrainingStatus[]>();
  readonly selectedHashes = input<string[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly toggleSubline = output<string>();
  readonly drillSelected = output<void>();
  readonly trainWholeLine = output<void>();
  protected readonly trainingStatusLabel = trainingStatusLabel;
  protected readonly percentLabel = percentLabel;
  protected isSelected(hash: string): boolean {
    return this.selectedHashes().includes(hash);
  }
}
