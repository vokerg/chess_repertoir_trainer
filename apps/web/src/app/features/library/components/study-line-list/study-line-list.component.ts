import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import type { LibraryLine } from '../../data-access/library.models';
import {
  lineStatus,
  masteryLabel,
  sideLabel,
  statusLabel,
} from '../../helpers/library-line.helpers';

@Component({
  selector: 'app-study-line-list',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './study-line-list.component.html',
  styleUrl: './study-line-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyLineListComponent {
  readonly title = input('Lines');
  readonly subtitle = input('Review and select lines.');
  readonly lines = input.required<readonly LibraryLine[]>();
  readonly selectedLineIds = input<readonly number[]>([]);
  readonly searchText = input('');
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly searchTextChange = output<string>();
  readonly toggleLine = output<number>();
  readonly selectAllVisible = output<void>();
  readonly clearSelection = output<void>();

  protected readonly lineStatus = lineStatus;
  protected readonly statusLabel = statusLabel;
  protected readonly sideLabel = sideLabel;
  protected readonly selectedCount = computed(() => this.selectedLineIds().length);
  protected readonly sectionHealth = computed(() => {
    const totals = this.lines().reduce(
      (summary, line) => ({
        active: summary.active + line.trainingStats.activeSublineCount,
        weightedMastery:
          summary.weightedMastery +
          line.trainingStats.passRate * line.trainingStats.activeSublineCount,
        weak: summary.weak + line.trainingStats.weakSublineCount,
        untrained: summary.untrained + line.trainingStats.untrainedSublineCount,
      }),
      { active: 0, weightedMastery: 0, weak: 0, untrained: 0 },
    );
    const mastery =
      totals.active > 0
        ? Math.round((totals.weightedMastery / totals.active) * 100)
        : 0;

    return { mastery, weak: totals.weak, untrained: totals.untrained };
  });

  protected isChecked(lineId: number): boolean {
    return this.selectedLineIds().includes(lineId);
  }

  protected updateSearch(event: Event): void {
    this.searchTextChange.emit((event.target as HTMLInputElement).value);
  }

  protected masteryPercent(line: LibraryLine): number {
    return Math.round(line.trainingStats.passRate * 100);
  }

  protected lineMasteryLabel(line: LibraryLine): string {
    return masteryLabel(line.trainingStats.passRate);
  }
}
