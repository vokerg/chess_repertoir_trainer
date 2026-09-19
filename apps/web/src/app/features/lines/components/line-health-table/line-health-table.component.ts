import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LineSummary, SublineTrainingStatus } from '../../data-access/lines.models';
import { coverageLabel, percentLabel, trainingStatusLabel } from '../../helpers/training-status.helpers';
import { LineActionMenuComponent } from '../line-action-menu/line-action-menu.component';
import { LineTrainingStatusPanelComponent } from '../line-training-status-panel/line-training-status-panel.component';

@Component({
  selector: 'app-line-health-table',
  standalone: true,
  imports: [RouterLink, LineActionMenuComponent, LineTrainingStatusPanelComponent],
  templateUrl: './line-health-table.component.html',
  styleUrl: './line-health-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineHealthTableComponent {
  readonly lines = input.required<LineSummary[]>();
  readonly selectedLineIds = input<number[]>([]);
  readonly expandedLineId = input<number | null>(null);
  readonly sublineStatusByLineId = input<Record<number, SublineTrainingStatus[]>>({});
  readonly selectedSublineHashesByLineId = input<Record<number, string[]>>({});
  readonly transferLineId = input<number | null>(null);
  readonly loadingSublineStatusLineId = input<number | null>(null);
  readonly sublineStatusError = input<string | null>(null);
  readonly deletingLineId = input<number | null>(null);
  readonly toggleLineSelected = output<number>();
  readonly toggleExpandedLine = output<number>();
  readonly trainLine = output<LineSummary>();
  readonly editLine = output<LineSummary>();
  readonly renameLine = output<LineSummary>();
  readonly moveLine = output<LineSummary>();
  readonly copyLine = output<LineSummary>();
  readonly deleteLine = output<LineSummary>();
  readonly toggleSublineHash = output<{ lineId: number; hash: string }>();
  readonly drillSelectedSublines = output<number>();
  protected readonly coverageLabel = coverageLabel;
  protected readonly percentLabel = percentLabel;
  protected readonly trainingStatusLabel = trainingStatusLabel;
  protected isSelected(lineId: number): boolean {
    return this.selectedLineIds().includes(lineId);
  }
}
