import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LineSummary } from '../../data-access/lines.models';

@Component({
  selector: 'app-line-action-menu',
  standalone: true,
  templateUrl: './line-action-menu.component.html',
  styleUrl: './line-action-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineActionMenuComponent {
  readonly line = input.required<LineSummary>();
  readonly deleting = input(false);
  readonly renameLine = output<LineSummary>();
  readonly moveLine = output<LineSummary>();
  readonly copyLine = output<LineSummary>();
  readonly deleteLine = output<LineSummary>();
}
