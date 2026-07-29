import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LibraryLine } from '../../data-access/library.models';
import {
  coverageLabel,
  lineStatus,
  masteryLabel,
  sideLabel,
  statusLabel,
} from '../../helpers/library-line.helpers';

@Component({
  selector: 'app-study-line-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './study-line-list.component.html',
  styleUrl: './study-line-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyLineListComponent {
  readonly stepLabel = input.required<string>();
  readonly title = input('Lines');
  readonly subtitle = input('Review and select lines.');
  readonly lines = input.required<LibraryLine[]>();
  readonly selectedLineId = input<number | null>(null);
  readonly selectedLineIds = input<number[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly selectLine = output<number>();
  readonly toggleLine = output<number>();
  protected readonly lineStatus = lineStatus;
  protected readonly statusLabel = statusLabel;
  protected readonly sideLabel = sideLabel;
  protected readonly masteryLabel = masteryLabel;
  protected readonly coverageLabel = coverageLabel;

  protected isChecked(lineId: number): boolean {
    return this.selectedLineIds().includes(lineId);
  }
}
