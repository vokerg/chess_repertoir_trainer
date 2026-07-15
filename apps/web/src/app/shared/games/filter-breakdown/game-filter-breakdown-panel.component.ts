import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProgressiveListComponent } from '../../ui/progressive-list/progressive-list.component';

export interface GameFilterBreakdownItem {
  key: string;
  label: string;
  detail?: string | null;
  games: number;
  wdl?: {
    wins: number;
    draws: number;
    losses: number;
  };
}

@Component({
  selector: 'app-game-filter-breakdown-panel',
  standalone: true,
  imports: [ProgressiveListComponent],
  templateUrl: './game-filter-breakdown-panel.component.html',
  styleUrl: './game-filter-breakdown-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameFilterBreakdownPanelComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('Click a row to apply it as a game filter.');
  readonly items = input<readonly GameFilterBreakdownItem[]>([]);
  readonly selectedKeys = input<readonly string[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyText = input('No matching groups.');
  readonly limit = input(4);
  readonly itemSelected = output<string>();

  protected readonly selected = computed(() => new Set(this.selectedKeys()));
}
